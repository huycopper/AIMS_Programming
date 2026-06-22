import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service.js';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const aimsOrigin = 'http://localhost:8080';
  let authReq = req;

  if (req.url.startsWith(aimsOrigin + '/')) {
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
      if (err.status === 401 && !req.url.endsWith('/api/auth/login')) {
        authService.logout();
        router.navigate(['/staff/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      return throwError(() => err);
    }),
  );
};
