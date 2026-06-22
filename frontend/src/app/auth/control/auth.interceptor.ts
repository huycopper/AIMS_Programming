import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService, AIMS_API_BASE } from './auth.service.js';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let aimsOrigin = '';
  try {
    aimsOrigin = new URL(AIMS_API_BASE).origin;
  } catch {}

  let reqOrigin = '';
  try {
    reqOrigin = new URL(req.url, window.location.origin).origin;
  } catch {}

  let authReq = req;

  if (reqOrigin === aimsOrigin && aimsOrigin !== '') {
    const token = authService.accessToken();
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(authReq).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.endsWith('/api/auth/login')) {
        authService.clearSession();
        if (!router.url.startsWith('/staff/login')) {
          router.navigate(['/staff/login'], {
            queryParams: { returnUrl: router.url },
          });
        }
      }
      return throwError(() => err);
    }),
  );
};
