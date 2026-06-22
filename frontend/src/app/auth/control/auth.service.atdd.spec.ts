// @vitest-environment jsdom

import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, AUTH_SESSION_STORAGE_KEY } from './auth.service';

const principal = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'dual.staff',
  email: 'dual.staff@example.test',
  roles: ['ADMIN', 'PRODUCT_MANAGER'] as const,
};

const loginResponse = {
  accessToken: 'header.payload.signature',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  user: principal,
};

describe('AuthService (Story 5.3 ATDD)', () => {
  let http: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    http = { post: vi.fn(), get: vi.fn() };
    router = { navigateByUrl: vi.fn(), navigate: vi.fn() };
    service = new AuthService(http as unknown as HttpClient, router as unknown as Router);
  });

  it('[P1] logs in without mutating the password and stores only the token/session projection', async () => {
    http.post.mockReturnValue(of(loginResponse));
    const password = ' ValidPassword1 ';

    await firstValueFrom(service.login(' dual.staff ', password));

    expect(http.post).toHaveBeenCalledWith('http://localhost:8080/api/auth/login', {
      identifier: ' dual.staff ',
      password,
    });
    expect(service.currentUser()).toEqual(principal);
    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasRole('PRODUCT_MANAGER')).toBe(true);
    const persisted = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? '';
    expect(persisted).toContain(loginResponse.accessToken);
    expect(persisted).not.toContain(password);
  });

  it('[P1] restores a valid session through the authoritative /me endpoint', async () => {
    sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: loginResponse.accessToken }),
    );
    http.get.mockReturnValue(of(principal));

    await firstValueFrom(service.restoreSession());

    expect(http.get).toHaveBeenCalledWith('http://localhost:8080/api/auth/me');
    expect(service.currentUser()).toEqual(principal);
    expect(service.roles()).toEqual(['ADMIN', 'PRODUCT_MANAGER']);
  });

  it.each(['not-json', JSON.stringify({ accessToken: '' })])(
    '[P1] fails closed for malformed stored session %s',
    async (stored) => {
      sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, stored);
      await firstValueFrom(service.restoreSession());
      expect(service.currentUser()).toBeNull();
      expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
      expect(http.get).not.toHaveBeenCalled();
    },
  );

  it('[P1] clears the session when authoritative restoration returns 401', async () => {
    sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: loginResponse.accessToken }),
    );
    http.get.mockReturnValue(throwError(() => ({ status: 401 })));

    await expect(firstValueFrom(service.restoreSession())).resolves.toBeUndefined();

    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('[P1] sends no confirmation field and logs out after a successful password change', async () => {
    http.post.mockReturnValue(of(undefined));
    sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: loginResponse.accessToken }),
    );

    await firstValueFrom(service.changePassword('CurrentPassword1', 'NewPassword2'));

    expect(http.post).toHaveBeenCalledWith('http://localhost:8080/api/auth/change-password', {
      currentPassword: 'CurrentPassword1',
      newPassword: 'NewPassword2',
    });
    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/staff/login');
  });
});
