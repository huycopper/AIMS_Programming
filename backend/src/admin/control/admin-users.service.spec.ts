import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { AdminUsersService } from './admin-users.service.js';
import { User } from '../../user/entities/user.entity.js';
import { Role } from '../../user/entities/role.entity.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AdminAuditLogControl } from './admin-audit-log.control.js';
import { PasswordResetTokenControl } from './password-reset-token.control.js';
import { AdminNotificationControl } from './admin-notification.control.js';
import { ConfigService } from '@nestjs/config';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let qb: jest.Mocked<SelectQueryBuilder<User>>;
  let auditLogControl: jest.Mocked<AdminAuditLogControl>;
  let passwordResetTokenControl: jest.Mocked<PasswordResetTokenControl>;
  let notificationControl: jest.Mocked<AdminNotificationControl>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;
  let manager: any;

  beforeEach(async () => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      where: jest.fn().mockReturnThis(),
    } as any;

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as any;

    roleRepo = {} as any;

    auditLogControl = {
      recordSensitiveAction: jest.fn().mockResolvedValue({ auditLogId: 'audit1' }),
      updateNotificationStatus: jest.fn().mockResolvedValue(undefined),
    } as any;

    passwordResetTokenControl = {
      generateToken: jest.fn().mockResolvedValue({ rawToken: 'reset123', entity: {} }),
    } as any;

    notificationControl = {
      sendAccountCreated: jest.fn().mockResolvedValue(true),
      sendRolesChanged: jest.fn().mockResolvedValue(true),
      sendStatusChanged: jest.fn().mockResolvedValue(true),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'BCRYPT_SALT_ROUNDS') return '10';
        if (key === 'APP_PUBLIC_URL') return 'http://localhost:4200';
        return null;
      }),
    } as any;

    manager = {
      save: jest.fn().mockImplementation(async (entityClass, entity) => entity),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => cb(manager)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepo,
        },
        {
          provide: AdminAuditLogControl,
          useValue: auditLogControl,
        },
        {
          provide: PasswordResetTokenControl,
          useValue: passwordResetTokenControl,
        },
        {
          provide: AdminNotificationControl,
          useValue: notificationControl,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  describe('getUsersList', () => {
    it('should query and return users with default pagination', async () => {
      const mockUsers = [
        {
          userId: 'u1',
          username: 'user1',
          email: 'user1@example.com',
          status: 'ACTIVE',
          roles: [{ roleName: 'ADMIN' }],
        },
      ];

      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue(mockUsers as any);

      const result = await service.getUsersList({});

      expect(userRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('user.roles', 'role');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        items: [
          {
            userId: 'u1',
            username: 'user1',
            email: 'user1@example.com',
            status: 'ACTIVE',
            roles: ['ADMIN'],
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
    });

    it('should filter by status, search, and role', async () => {
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      await service.getUsersList({
        page: 2,
        limit: 10,
        status: 'BLOCKED',
        search: 'test',
        role: 'ADMIN',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('user.status = :status', { status: 'BLOCKED' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(user.username) LIKE :searchPattern OR LOWER(user.email) LIKE :searchPattern)',
        { searchPattern: '%test%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(expect.any(Function));
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getUserDetail', () => {
    it('should return user detail if found', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'ADMIN' }],
      };

      qb.getOne.mockResolvedValue(mockUser as any);

      const result = await service.getUserDetail('u1');

      expect(qb.where).toHaveBeenCalledWith('user.userId = :userId', { userId: 'u1' });
      expect(result).toEqual({
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: ['ADMIN'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.getUserDetail('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUser', () => {
    it('should create user, assign roles, create reset token, log and notify on success', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      roleRepo.find = jest.fn().mockResolvedValue([
        { roleId: 'r1', roleName: 'PRODUCT_MANAGER' },
      ]);

      const result = await service.createUser('actor1', {
        username: 'newpm',
        email: 'pm@aims.com',
        roles: ['PRODUCT_MANAGER'],
      });

      expect(userRepo.createQueryBuilder).toHaveBeenCalled();
      expect(roleRepo.find).toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(manager.save).toHaveBeenCalled();
      expect(passwordResetTokenControl.generateToken).toHaveBeenCalledWith(
        expect.any(String),
        'actor1',
        60,
        manager,
      );
      expect(auditLogControl.recordSensitiveAction).toHaveBeenCalled();
      expect(notificationControl.sendAccountCreated).toHaveBeenCalledWith(
        'pm@aims.com',
        'newpm',
        'http://localhost:4200/staff/reset-password?token=reset123',
      );
      expect(auditLogControl.updateNotificationStatus).toHaveBeenCalledWith(
        'audit1',
        'SENT',
      );

      expect(result).toEqual({
        userId: expect.any(String),
        username: 'newpm',
        email: 'pm@aims.com',
        status: 'ACTIVE',
        roles: ['PRODUCT_MANAGER'],
      });
    });

    it('should throw ConflictException if username is taken', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          username: 'newpm',
          email: 'other@aims.com',
        }),
      } as any);

      await expect(
        service.createUser('actor1', {
          username: 'newpm',
          email: 'pm@aims.com',
          roles: ['PRODUCT_MANAGER'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email is registered', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          username: 'other',
          email: 'pm@aims.com',
        }),
      } as any);

      await expect(
        service.createUser('actor1', {
          username: 'newpm',
          email: 'pm@aims.com',
          roles: ['PRODUCT_MANAGER'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if requested roles are invalid', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      roleRepo.find = jest.fn().mockResolvedValue([]); // return empty roles

      await expect(
        service.createUser('actor1', {
          username: 'newpm',
          email: 'pm@aims.com',
          roles: ['PRODUCT_MANAGER'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles and notify on success', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'ADMIN' }],
      };
      
      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      } as any);

      roleRepo.find = jest.fn().mockResolvedValue([
        { roleId: 'r2', roleName: 'PRODUCT_MANAGER' },
      ]);

      const result = await service.updateUserRoles('actor1', 'u1', {
        roles: ['PRODUCT_MANAGER'],
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(notificationControl.sendRolesChanged).toHaveBeenCalledWith(
        'user1@example.com',
        'user1',
        ['ADMIN'],
        ['PRODUCT_MANAGER'],
      );
      expect(result.roles).toEqual(['PRODUCT_MANAGER']);
    });

    it('should prevent removing the last ADMIN role', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'ADMIN' }],
      };
      
      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as any);

      await expect(
        service.updateUserRoles('actor1', 'u1', {
          roles: ['PRODUCT_MANAGER'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUserStatus', () => {
    it('should update status and notify on success', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'PRODUCT_MANAGER' }],
      };
      
      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.updateUserStatus('actor1', 'u1', {
        status: 'BLOCKED',
        reason: 'Violation',
      });

      expect(manager.save).toHaveBeenCalled();
      expect(notificationControl.sendStatusChanged).toHaveBeenCalledWith(
        'user1@example.com',
        'user1',
        'BLOCKED',
        'Violation',
      );
      expect(result.status).toBe('BLOCKED');
    });

    it('should prevent blocking/deactivating the last active admin', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'ADMIN' }],
      };
      
      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as any);

      await expect(
        service.updateUserStatus('actor1', 'u1', {
          status: 'BLOCKED',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('triggerPasswordReset', () => {
    it('should generate reset token and notify on success', async () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'user1@example.com',
        status: 'ACTIVE',
        roles: [{ roleName: 'PRODUCT_MANAGER' }],
      };

      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      } as any);

      notificationControl.sendPasswordResetTriggered = jest.fn().mockResolvedValue(true);

      const result = await service.triggerPasswordReset('actor1', 'u1');

      expect(passwordResetTokenControl.generateToken).toHaveBeenCalledWith(
        'u1',
        'actor1',
        60,
        manager,
      );
      expect(auditLogControl.recordSensitiveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor1',
          affectedUserId: 'u1',
          actionType: 'PASSWORD_RESET_TRIGGERED',
        }),
        manager,
      );
      expect(notificationControl.sendPasswordResetTriggered).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 'u1',
        email: 'user1@example.com',
        resetEmailQueued: true,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.triggerPasswordReset('actor1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
