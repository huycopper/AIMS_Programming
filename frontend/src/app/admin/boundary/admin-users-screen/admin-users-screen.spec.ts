import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminUsersScreen } from './admin-users-screen';
import { of, throwError } from 'rxjs';

describe('AdminUsersScreen', () => {
  let component: AdminUsersScreen;
  let adminUserService: any;
  let authService: any;
  let router: any;

  beforeEach(() => {
    adminUserService = {
      getUsersList: vi.fn().mockReturnValue(of({ items: [], page: 1, limit: 20, total: 0 })),
      getUserDetail: vi.fn(),
      createUser: vi.fn(),
      updateUserRoles: vi.fn(),
      updateUserStatus: vi.fn(),
      triggerPasswordReset: vi.fn(),
    };

    authService = {
      currentUser: vi.fn().mockReturnValue({ username: 'admin' }),
      hasRole: vi.fn().mockReturnValue(true),
      logout: vi.fn(),
    };

    router = {
      navigate: vi.fn(),
    };

    component = new AdminUsersScreen(adminUserService, authService, router, { markForCheck: vi.fn() } as any);
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    expect(adminUserService.getUsersList).toHaveBeenCalled();
  });

  it('should filter users on search', () => {
    component.search = 'john';
    component.statusFilter = 'ACTIVE';
    component.roleFilter = 'ADMIN';

    component.applyFilters();

    expect(adminUserService.getUsersList).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: 'john',
      status: 'ACTIVE',
      role: 'ADMIN',
    });
  });

  it('should clear filters', () => {
    component.search = 'john';
    component.statusFilter = 'ACTIVE';
    component.roleFilter = 'ADMIN';

    component.clearFilters();

    expect(component.search).toBe('');
    expect(component.statusFilter).toBe('');
    expect(component.roleFilter).toBe('');
    expect(adminUserService.getUsersList).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      status: undefined,
      role: undefined,
    });
  });

  it('should handle pagination next and prev', () => {
    component.total = 50; // 3 pages
    component.limit = 20;

    expect(component.totalPages).toBe(3);

    component.onPageChange(2);
    expect(adminUserService.getUsersList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('should display error message on fetch failure', () => {
    adminUserService.getUsersList.mockReturnValueOnce(throwError(() => ({ error: { message: 'Fetch error' } })));
    component.loadUsers();
    expect(component.errorMessage).toBe('Fetch error');
  });

  describe('create user dialog flow', () => {
    it('should open and close create user dialog', () => {
      expect(component.isCreateModalOpen).toBe(false);
      component.openCreateUser();
      expect(component.isCreateModalOpen).toBe(true);
      expect(component.createModel.username).toBe('');
      
      component.closeCreateUser();
      expect(component.isCreateModalOpen).toBe(false);
    });

    it('should submit user creation and refresh directory on success', () => {
      const mockCreatedUser = {
        userId: 'u2',
        username: 'newpm',
        email: 'pm@aims.com',
        status: 'ACTIVE' as const,
        roles: ['PRODUCT_MANAGER'],
      };
      adminUserService.createUser.mockReturnValue(of(mockCreatedUser));

      component.openCreateUser();
      component.createModel.username = 'newpm';
      component.createModel.email = 'pm@aims.com';
      component.createModel.rolePM = true;

      const event = { preventDefault: vi.fn() } as any;
      component.submitCreateUser(event);

      expect(adminUserService.createUser).toHaveBeenCalledWith({
        username: 'newpm',
        email: 'pm@aims.com',
        roles: ['PRODUCT_MANAGER'],
      });
      expect(component.isCreateModalOpen).toBe(false);
      expect(component.successMessage).toContain('created successfully');
      expect(adminUserService.getUsersList).toHaveBeenCalledTimes(2); // init + success refresh
    });

    it('should set modal error message on submission failure', () => {
      adminUserService.createUser.mockReturnValue(
        throwError(() => ({ error: { message: 'Username is already taken.' } }))
      );

      component.openCreateUser();
      component.createModel.username = 'newpm';
      component.createModel.email = 'pm@aims.com';
      component.createModel.rolePM = true;

      const event = { preventDefault: vi.fn() } as any;
      component.submitCreateUser(event);

      expect(component.modalErrorMessage).toBe('Username is already taken.');
      expect(component.isCreateModalOpen).toBe(true);
    });
  });

  describe('edit roles flow', () => {
    it('should open and close edit roles dialog', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      expect(component.isEditRolesModalOpen).toBe(false);
      component.editRoles(mockUser);
      expect(component.isEditRolesModalOpen).toBe(true);
      expect(component.editRolesModel.user).toBe(mockUser);
      expect(component.editRolesModel.roleAdmin).toBe(true);
      expect(component.editRolesModel.rolePM).toBe(false);

      component.closeEditRoles();
      expect(component.isEditRolesModalOpen).toBe(false);
    });

    it('should submit roles update and refresh directory on success', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      adminUserService.updateUserRoles.mockReturnValue(of({ ...mockUser, roles: ['ADMIN', 'PRODUCT_MANAGER'] }));

      component.editRoles(mockUser);
      component.editRolesModel.rolePM = true; // add PRODUCT_MANAGER

      const event = { preventDefault: vi.fn() } as any;
      component.submitEditRoles(event);

      expect(adminUserService.updateUserRoles).toHaveBeenCalledWith('u1', ['ADMIN', 'PRODUCT_MANAGER']);
      expect(component.isEditRolesModalOpen).toBe(false);
      expect(component.successMessage).toContain('updated successfully');
      expect(adminUserService.getUsersList).toHaveBeenCalledTimes(2); // init + success refresh
    });
  });

  describe('toggle account status flow', () => {
    let confirmMock: any;

    beforeEach(() => {
      confirmMock = vi.fn().mockReturnValue(true);
      (globalThis as any).window = { confirm: confirmMock };
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('should block user and refresh directory', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      adminUserService.updateUserStatus.mockReturnValue(of({ ...mockUser, status: 'BLOCKED' as const }));

      component.toggleBlockUser(mockUser, true);

      expect(confirmMock).toHaveBeenCalled();
      expect(adminUserService.updateUserStatus).toHaveBeenCalledWith('u1', 'BLOCKED');
      expect(component.successMessage).toContain('blocked');
      expect(adminUserService.getUsersList).toHaveBeenCalledTimes(2);
    });

    it('should deactivate user and refresh directory', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      adminUserService.updateUserStatus.mockReturnValue(of({ ...mockUser, status: 'DEACTIVATED' as const }));

      component.toggleDeactivateUser(mockUser, true);

      expect(confirmMock).toHaveBeenCalled();
      expect(adminUserService.updateUserStatus).toHaveBeenCalledWith('u1', 'DEACTIVATED');
      expect(component.successMessage).toContain('deactivated');
      expect(adminUserService.getUsersList).toHaveBeenCalledTimes(2);
    });
  });

  describe('trigger password reset flow', () => {
    let confirmMock: any;

    beforeEach(() => {
      confirmMock = vi.fn().mockReturnValue(true);
      (globalThis as any).window = { confirm: confirmMock };
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('should trigger password reset and show success message when email is queued', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      adminUserService.triggerPasswordReset.mockReturnValue(
        of({ userId: 'u1', email: 'u1@aims.com', resetEmailQueued: true })
      );

      component.triggerPasswordReset(mockUser);

      expect(confirmMock).toHaveBeenCalled();
      expect(adminUserService.triggerPasswordReset).toHaveBeenCalledWith('u1');
      expect(component.successMessage).toContain('successfully sent to u1@aims.com');
    });

    it('should show partial success message when reset email queue fails', () => {
      const mockUser = {
        userId: 'u1',
        username: 'user1',
        email: 'u1@aims.com',
        status: 'ACTIVE' as const,
        roles: ['ADMIN'],
      };
      adminUserService.triggerPasswordReset.mockReturnValue(
        of({ userId: 'u1', email: 'u1@aims.com', resetEmailQueued: false })
      );

      component.triggerPasswordReset(mockUser);

      expect(adminUserService.triggerPasswordReset).toHaveBeenCalledWith('u1');
      expect(component.successMessage).toContain('token was generated, but the notification email failed');
    });
  });
});
