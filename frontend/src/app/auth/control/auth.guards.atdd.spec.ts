// @vitest-environment jsdom

import '@angular/compiler';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authGuard, roleGuard, sanitizeReturnUrl } from './auth.guards';

describe('authentication and role guards (Story 5.3 ATDD)', () => {
  try {
    getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  } catch {}

  const auth = {
    isAuthenticated: vi.fn(),
    hasAnyRole: vi.fn(),
  };
  const router = {
    createUrlTree: vi.fn(
      (commands: string[], extras?: unknown) => ({ commands, extras }) as unknown as UrlTree,
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('[P1] sends unauthenticated protected navigation to login with a safe return URL', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/admin/products?search=book' } as RouterStateSnapshot,
      ),
    );
    expect(result).toEqual(expect.objectContaining({ commands: ['/staff/login'] }));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/staff/login'], {
      queryParams: { returnUrl: '/admin/products?search=book' },
    });
  });

  it.each([
    ['ADMIN only', ['ADMIN'], ['ADMIN'], true],
    ['PRODUCT_MANAGER only', ['PRODUCT_MANAGER'], ['PRODUCT_MANAGER'], true],
    [
      'dual role for either-role route',
      ['ADMIN', 'PRODUCT_MANAGER'],
      ['ADMIN', 'PRODUCT_MANAGER'],
      true,
    ],
    ['unassigned role', ['ADMIN'], ['PRODUCT_MANAGER'], false],
  ])('[P1] applies any-match authorization for %s', (_case, assigned, required, allowed) => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.hasAnyRole.mockImplementation((roles: string[]) =>
      roles.some((role) => (assigned as string[]).includes(role)),
    );
    const route = { data: { roles: required } } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, { url: '/admin/products' } as RouterStateSnapshot),
    );
    expect(result === true).toBe(allowed);
    if (!allowed) expect(router.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
  });

  it.each([
    ['/admin/products', '/admin/products'],
    ['/staff/change-password?from=menu', '/staff/change-password?from=menu'],
    ['//evil.example/steal', null],
    ['https://evil.example/steal', null],
    ['%2F%2Fevil.example/steal', null],
    ['/\\evil.example/steal', null],
    ['javascript:alert(1)', null],
  ])('[P1] sanitizes return URL %s', (candidate, expected) => {
    expect(sanitizeReturnUrl(candidate)).toBe(expected);
  });
});
