import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from '../control/admin-users.service.js';
import { JwtAuthGuard } from '../../auth/control/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/control/roles.guard.js';
import { ExecutionContext } from '@nestjs/common';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: jest.Mocked<AdminUsersService>;

  beforeEach(async () => {
    service = {
      getUsersList: jest.fn(),
      getUserDetail: jest.fn(),
      createUser: jest.fn(),
      updateUserRoles: jest.fn(),
      updateUserStatus: jest.fn(),
      triggerPasswordReset: jest.fn(),
    } as any;

    const mockGuard = {
      canActivate: (context: ExecutionContext) => true,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: AdminUsersService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('should list users', async () => {
    const query = { page: 1, limit: 10 };
    const mockResult = { items: [], page: 1, limit: 10, total: 0 };
    service.getUsersList.mockResolvedValue(mockResult);

    const result = await controller.getUsersList(query);

    expect(service.getUsersList).toHaveBeenCalledWith(query);
    expect(result).toBe(mockResult);
  });

  it('should get user detail', async () => {
    const mockUser = {
      userId: 'u1',
      username: 'user1',
      email: 'user1@example.com',
      status: 'ACTIVE',
      roles: ['ADMIN'],
    };
    service.getUserDetail.mockResolvedValue(mockUser);

    const result = await controller.getUserDetail('u1');

    expect(service.getUserDetail).toHaveBeenCalledWith('u1');
    expect(result).toBe(mockUser);
  });

  it('should create user', async () => {
    const dto = {
      username: 'newpm',
      email: 'pm@aims.com',
      roles: ['PRODUCT_MANAGER' as const],
    };
    const mockUser = {
      userId: 'u2',
      username: 'newpm',
      email: 'pm@aims.com',
      status: 'ACTIVE',
      roles: ['PRODUCT_MANAGER'],
    };
    service.createUser.mockResolvedValue(mockUser);

    const req = { user: { userId: 'admin1' } };
    const result = await controller.createUser(req, dto);

    expect(service.createUser).toHaveBeenCalledWith('admin1', dto);
    expect(result).toBe(mockUser);
  });

  it('should update user roles', async () => {
    const dto = { roles: ['ADMIN' as const] };
    const mockUser = { userId: 'u1', username: 'user1', email: 'u1@aims.com', status: 'ACTIVE', roles: ['ADMIN'] };
    service.updateUserRoles.mockResolvedValue(mockUser);

    const req = { user: { userId: 'admin1' } };
    const result = await controller.updateUserRoles(req, 'u1', dto);

    expect(service.updateUserRoles).toHaveBeenCalledWith('admin1', 'u1', dto);
    expect(result).toBe(mockUser);
  });

  it('should update user status', async () => {
    const dto = { status: 'BLOCKED' as const, reason: 'Violation' };
    const mockUser = { userId: 'u1', username: 'user1', email: 'u1@aims.com', status: 'BLOCKED', roles: ['ADMIN'] };
    service.updateUserStatus.mockResolvedValue(mockUser);

    const req = { user: { userId: 'admin1' } };
    const result = await controller.updateUserStatus(req, 'u1', dto);

    expect(service.updateUserStatus).toHaveBeenCalledWith('admin1', 'u1', dto);
    expect(result).toBe(mockUser);
  });

  it('should trigger password reset', async () => {
    const mockResult = { userId: 'u1', email: 'u1@aims.com', resetEmailQueued: true };
    service.triggerPasswordReset.mockResolvedValue(mockResult);

    const req = { user: { userId: 'admin1' } };
    const result = await controller.triggerPasswordReset(req, 'u1');

    expect(service.triggerPasswordReset).toHaveBeenCalledWith('admin1', 'u1');
    expect(result).toBe(mockResult);
  });
});
