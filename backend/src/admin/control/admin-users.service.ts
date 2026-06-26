import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { Role } from '../../user/entities/role.entity.js';
import { UserRole } from '../../user/entities/user-role.entity.js';
import { QueryAdminUsersDto } from '../dto/query-admin-users.dto.js';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto.js';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';
import { AdminAuditLogControl } from './admin-audit-log.control.js';
import { PasswordResetTokenControl } from './password-reset-token.control.js';
import { AdminNotificationControl } from './admin-notification.control.js';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { hash } from 'bcrypt';

export interface AdminUserResponse {
  userId: string;
  username: string;
  email: string;
  status: string;
  roles: string[];
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditLogControl: AdminAuditLogControl,
    private readonly passwordResetTokenControl: PasswordResetTokenControl,
    private readonly notificationControl: AdminNotificationControl,
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  async getUsersList(query: QueryAdminUsersDto): Promise<{
    items: AdminUserResponse[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.search) {
      const searchPattern = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.username) LIKE :searchPattern OR LOWER(user.email) LIKE :searchPattern)',
        { searchPattern },
      );
    }

    if (query.role) {
      // To filter by role correctly in many-to-many, we can use a subquery or exist check
      qb.andWhere((subQuery) => {
        const sub = subQuery
          .subQuery()
          .select('ur.user_id')
          .from('user_roles', 'ur')
          .innerJoin('roles', 'r', 'r.role_id = ur.role_id')
          .where('r.role_name = :roleName', { roleName: query.role })
          .getQuery();
        return `user.user_id IN ${sub}`;
      });
    }

    // Sort deterministically
    qb.orderBy('user.username', 'ASC').addOrderBy('user.email', 'ASC');

    // For many-to-many relationship, count must be retrieved correctly
    const total = await qb.getCount();

    // pagination
    qb.skip(skip).take(limit);
    const users = await qb.getMany();

    const items = users.map((user) => ({
      userId: user.userId,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: user.roles.map((r) => r.roleName),
    }));

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserResponse> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: user.roles.map((r) => r.roleName),
    };
  }

  async createUser(
    actorUserId: string,
    dto: CreateAdminUserDto,
  ): Promise<AdminUserResponse> {
    // 1. Preemptive duplicate checks (case-insensitive)
    const existingUser = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username) OR LOWER(user.email) = LOWER(:email)', {
        username: dto.username,
        email: dto.email,
      })
      .getOne();

    if (existingUser) {
      if (existingUser.username.toLowerCase() === dto.username.toLowerCase()) {
        this.logger.warn(`createUser failed — duplicate username="${dto.username}" (actor=${actorUserId})`);
        throw new ConflictException('Username is already taken.');
      }
      if (existingUser.email.toLowerCase() === dto.email.toLowerCase()) {
        this.logger.warn(`createUser failed — duplicate email="${dto.email}" (actor=${actorUserId})`);
        throw new ConflictException('Email is already registered.');
      }
    }

    // 2. Validate and fetch roles
    const dbRoles = await this.roleRepo.find({
      where: { roleName: In(dto.roles) },
    });
    if (dbRoles.length !== dto.roles.length) {
      throw new BadRequestException('One or more specified roles are invalid.');
    }

    const userId = crypto.randomUUID();
    let rawToken = '';
    let auditLogId = '';

    // Use transaction
    await this.dataSource.transaction(async (manager) => {
      // Create user
      const user = new User();
      user.userId = userId;
      user.username = dto.username;
      user.email = dto.email;
      user.status = 'ACTIVE';

      // Generate random unusable password
      const tempPassword = crypto.randomBytes(32).toString('hex');
      const saltRoundsStr = this.configService.get<string>('BCRYPT_SALT_ROUNDS');
      const saltRounds = saltRoundsStr ? parseInt(saltRoundsStr, 10) : 12;
      user.passwordHash = await hash(tempPassword, saltRounds);

      await manager.save(User, user);

      // Save user_roles
      for (const role of dbRoles) {
        const userRole = new UserRole();
        userRole.userId = userId;
        userRole.roleId = role.roleId;
        await manager.save(UserRole, userRole);
      }

      // Generate reset/setup token
      const tokenResult = await this.passwordResetTokenControl.generateToken(
        userId,
        actorUserId,
        60, // 1 hour expiry
        manager,
      );
      rawToken = tokenResult.rawToken;

      // Write USER_CREATED audit log
      const auditLog = await this.auditLogControl.recordSensitiveAction(
        {
          actorUserId,
          affectedUserId: userId,
          actionType: 'USER_CREATED',
          metadataAfter: {
            username: dto.username,
            email: dto.email,
            roles: dto.roles,
            status: 'ACTIVE',
          },
          notificationEmail: dto.email,
        },
        manager,
      );
      auditLogId = auditLog.auditLogId;
    });

    // 3. Post-transaction notification
    const appUrl = this.configService.get<string>('APP_PUBLIC_URL') || 'http://localhost:4200';
    const setupLink = `${appUrl}/staff/reset-password?token=${rawToken}`;

    const emailSent = await this.notificationControl.sendAccountCreated(
      dto.email,
      dto.username,
      setupLink,
    );

    await this.auditLogControl.updateNotificationStatus(
      auditLogId,
      emailSent ? 'SENT' : 'FAILED',
    );

    this.logger.log(`User created successfully — userId=${userId}, username=${dto.username}, email=${dto.email}, roles=[${dto.roles}], emailSent=${emailSent} (actor=${actorUserId})`);

    // Return the created user response
    return {
      userId,
      username: dto.username,
      email: dto.email,
      status: 'ACTIVE',
      roles: dto.roles,
    };
  }

  private async checkLastAdminLockout(userId: string, actionType: 'ROLE' | 'STATUS', newRoles?: string[]): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const isActive = user.status === 'ACTIVE';
    const hasAdminRole = user.roles.some(r => r.roleName === 'ADMIN');

    if (isActive && hasAdminRole) {
      const isRemovingAdmin = actionType === 'STATUS' || (actionType === 'ROLE' && newRoles && !newRoles.includes('ADMIN'));

      if (isRemovingAdmin) {
        const activeAdminsCount = await this.userRepo
          .createQueryBuilder('user')
          .innerJoin('user.roles', 'role')
          .where('user.status = :status', { status: 'ACTIVE' })
          .andWhere('role.roleName = :roleName', { roleName: 'ADMIN' })
          .andWhere('user.userId != :userId', { userId })
          .getCount();

        if (activeAdminsCount === 0) {
          this.logger.warn(`Last-admin lockout blocked — targetUserId=${userId}, actionType=${actionType}`);
          throw new BadRequestException('Cannot modify status or remove ADMIN role because this is the last active Administrator in the system.');
        }
      }
    }
  }

  async updateUserRoles(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserRolesDto,
  ): Promise<AdminUserResponse> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId: targetUserId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found.`);
    }

    await this.checkLastAdminLockout(targetUserId, 'ROLE', dto.roles);

    const dbRoles = await this.roleRepo.find({
      where: { roleName: In(dto.roles) },
    });
    if (dbRoles.length !== dto.roles.length) {
      throw new BadRequestException('One or more specified roles are invalid.');
    }

    const oldRoles = user.roles.map(r => r.roleName);
    const newRoles = dto.roles;

    let auditLogId = '';

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserRole, { userId: targetUserId });

      for (const role of dbRoles) {
        const userRole = new UserRole();
        userRole.userId = targetUserId;
        userRole.roleId = role.roleId;
        await manager.save(UserRole, userRole);
      }

      const auditLog = await this.auditLogControl.recordSensitiveAction(
        {
          actorUserId,
          affectedUserId: targetUserId,
          actionType: 'USER_ROLES_CHANGED',
          metadataBefore: { roles: oldRoles },
          metadataAfter: { roles: newRoles },
          notificationEmail: user.email,
        },
        manager,
      );
      auditLogId = auditLog.auditLogId;
    });

    const emailSent = await this.notificationControl.sendRolesChanged(
      user.email,
      user.username,
      oldRoles,
      newRoles,
    );

    await this.auditLogControl.updateNotificationStatus(
      auditLogId,
      emailSent ? 'SENT' : 'FAILED',
    );

    this.logger.log(`Roles updated — targetUserId=${targetUserId}, oldRoles=[${oldRoles}], newRoles=[${newRoles}], emailSent=${emailSent} (actor=${actorUserId})`);

    return {
      userId: targetUserId,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: newRoles,
    };
  }

  async updateUserStatus(
    actorUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<AdminUserResponse> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId: targetUserId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found.`);
    }

    const oldStatus = user.status;
    const newStatus = dto.status;

    if (oldStatus === newStatus) {
      this.logger.debug(`updateUserStatus skipped — status unchanged (${oldStatus}) for userId=${targetUserId}`);
      return {
        userId: targetUserId,
        username: user.username,
        email: user.email,
        status: user.status,
        roles: user.roles.map(r => r.roleName),
      };
    }

    if (newStatus !== 'ACTIVE') {
      await this.checkLastAdminLockout(targetUserId, 'STATUS');
    }

    let actionType: string;
    if (newStatus === 'BLOCKED') {
      actionType = 'USER_BLOCKED';
    } else if (newStatus === 'DEACTIVATED') {
      actionType = 'USER_DEACTIVATED';
    } else {
      actionType = 'USER_UNBLOCKED';
    }

    let auditLogId = '';

    await this.dataSource.transaction(async (manager) => {
      user.status = newStatus;
      await manager.save(User, user);

      const auditLog = await this.auditLogControl.recordSensitiveAction(
        {
          actorUserId,
          affectedUserId: targetUserId,
          actionType,
          metadataBefore: { status: oldStatus },
          metadataAfter: { status: newStatus },
          reason: dto.reason || null,
          notificationEmail: user.email,
        },
        manager,
      );
      auditLogId = auditLog.auditLogId;
    });

    const emailSent = await this.notificationControl.sendStatusChanged(
      user.email,
      user.username,
      newStatus,
      dto.reason || null,
    );

    await this.auditLogControl.updateNotificationStatus(
      auditLogId,
      emailSent ? 'SENT' : 'FAILED',
    );

    this.logger.log(`Status updated — targetUserId=${targetUserId}, ${oldStatus}→${newStatus}, actionType=${actionType}, emailSent=${emailSent} (actor=${actorUserId})`);

    return {
      userId: targetUserId,
      username: user.username,
      email: user.email,
      status: newStatus,
      roles: user.roles.map(r => r.roleName),
    };
  }

  async triggerPasswordReset(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ userId: string; email: string; resetEmailQueued: boolean }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('user.userId = :userId', { userId: targetUserId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found.`);
    }

    let rawToken = '';
    let auditLogId = '';

    await this.dataSource.transaction(async (manager) => {
      const tokenResult = await this.passwordResetTokenControl.generateToken(
        targetUserId,
        actorUserId,
        60, // 1 hour expiry
        manager,
      );
      rawToken = tokenResult.rawToken;

      const auditLog = await this.auditLogControl.recordSensitiveAction(
        {
          actorUserId,
          affectedUserId: targetUserId,
          actionType: 'PASSWORD_RESET_TRIGGERED',
          notificationEmail: user.email,
        },
        manager,
      );
      auditLogId = auditLog.auditLogId;
    });

    const appUrl = this.configService.get<string>('APP_PUBLIC_URL') || 'http://localhost:4200';
    const resetLink = `${appUrl}/staff/reset-password?token=${rawToken}`;

    const emailSent = await this.notificationControl.sendPasswordResetTriggered(
      user.email,
      user.username,
      resetLink,
    );

    await this.auditLogControl.updateNotificationStatus(
      auditLogId,
      emailSent ? 'SENT' : 'FAILED',
    );

    this.logger.log(`Password reset triggered — targetUserId=${targetUserId}, email=${user.email}, emailSent=${emailSent} (actor=${actorUserId})`);

    return {
      userId: targetUserId,
      email: user.email,
      resetEmailQueued: emailSent,
    };
  }
}
