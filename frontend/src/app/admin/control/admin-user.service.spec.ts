import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminUserService } from './admin-user.service';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AIMS_API_BASE } from '../../auth/control/auth.service';

describe('AdminUserService', () => {
  let http: any;
  let service: AdminUserService;

  beforeEach(() => {
    http = {
      get: vi.fn(),
      post: vi.fn(),
    };
    service = new AdminUserService(http as unknown as HttpClient);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch users list with query parameters', () => {
    const mockResult = { items: [], page: 1, limit: 20, total: 0 };
    http.get.mockReturnValue(of(mockResult));

    service.getUsersList({ page: 2, limit: 10, search: 'test', status: 'BLOCKED', role: 'ADMIN' }).subscribe();

    expect(http.get).toHaveBeenCalledWith(
      `${AIMS_API_BASE}/api/admin/users`,
      expect.objectContaining({
        params: expect.any(Object),
      })
    );
  });

  it('should fetch user details', () => {
    http.get.mockReturnValue(of({}));

    service.getUserDetail('u1').subscribe();

    expect(http.get).toHaveBeenCalledWith(`${AIMS_API_BASE}/api/admin/users/u1`);
  });

  it('should create user', () => {
    http.post.mockReturnValue(of({}));
    const payload = { username: 'newpm', email: 'pm@aims.com', roles: ['PRODUCT_MANAGER'] };

    service.createUser(payload).subscribe();

    expect(http.post).toHaveBeenCalledWith(`${AIMS_API_BASE}/api/admin/users`, payload);
  });
});
