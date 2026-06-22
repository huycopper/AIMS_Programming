import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.js';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/staff/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/staff/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const requiredRoles = route.data?.['roles'] as string[];
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (authService.hasAnyRole(requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};

export function sanitizeReturnUrl(url: string | null): string | null {
  if (!url) return null;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {}

  if (!url.startsWith('/')) {
    return null;
  }

  if (url.startsWith('//') || url.startsWith('/\\') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
    return null;
  }

  if (url.toLowerCase().startsWith('javascript:')) {
    return null;
  }

  if (/^(https?:\/\/)/i.test(url) || /^(https?:\/\/)/i.test(decoded)) {
    return null;
  }

  return url;
}
