// @vitest-environment jsdom

import '@angular/compiler';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor (Story 5.3 ATDD)', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const auth = {
    accessToken: vi.fn(() => 'signed-token'),
    logout: vi.fn(),
  };
  const router = { navigate: vi.fn(), url: '/admin/products' };

  beforeEach(() => {
    auth.accessToken.mockReturnValue('signed-token');
    auth.logout.mockReset();
    router.navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it.each(['http://localhost:8080/api/auth/me', 'http://localhost:8080/api/products/admin'])(
    '[P1] attaches bearer auth to exact AIMS API origin: %s',
    (url) => {
      http.get(url).subscribe();
      const request = controller.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
      request.flush({});
    },
  );

  it.each([
    'http://localhost:8080.evil.example/api/products/admin',
    'http://localhost:80800/api/products/admin',
    'https://localhost:8080/api/products/admin',
    '/api/products/admin',
  ])('[P1] never leaks the token to a lookalike or non-configured origin: %s', (url) => {
    http.get(url).subscribe();
    const request = controller.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('[P1] clears once and redirects with a safe return URL on protected API 401', () => {
    http.get('http://localhost:8080/api/products/admin').subscribe({ error: () => undefined });
    controller
      .expectOne('http://localhost:8080/api/products/admin')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/staff/login'], {
      queryParams: { returnUrl: '/admin/products' },
    });
  });

  it('[P1] does not create a redirect loop for login 401', () => {
    router.url = '/staff/login';
    http.post('http://localhost:8080/api/auth/login', {}).subscribe({ error: () => undefined });
    controller
      .expectOne('http://localhost:8080/api/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('[P1] preserves a valid session on 403', () => {
    http.get('http://localhost:8080/api/products/admin').subscribe({ error: () => undefined });
    controller
      .expectOne('http://localhost:8080/api/products/admin')
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
