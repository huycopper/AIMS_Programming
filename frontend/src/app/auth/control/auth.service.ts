import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { UserProjection, LoginResponse } from '../entity/auth.models.js';

export const AUTH_SESSION_STORAGE_KEY = 'aims_staff_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser = signal<UserProjection | null>(null);
  roles = signal<string[]>([]);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.roles().some((r) => roles.includes(r));
  }

  accessToken(): string | null {
    const stored = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!stored) return null;
    try {
      const data = JSON.parse(stored);
      return data.accessToken || null;
    } catch {
      return null;
    }
  }

  login(identifier: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('http://localhost:8080/api/auth/login', {
        identifier,
        password,
      })
      .pipe(
        tap((res) => {
          sessionStorage.setItem(
            AUTH_SESSION_STORAGE_KEY,
            JSON.stringify({ accessToken: res.accessToken, user: res.user }),
          );
          this.currentUser.set(res.user);
          this.roles.set(res.user.roles || []);
        }),
      );
  }

  restoreSession(): Observable<any> {
    const stored = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!stored) {
      this.clearSession();
      return of(undefined);
    }
    try {
      const data = JSON.parse(stored);
      if (!data || !data.accessToken) {
        this.clearSession();
        return of(undefined);
      }
      return this.http.get<UserProjection>('http://localhost:8080/api/auth/me').pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.roles.set(user.roles || []);
        }),
        catchError((err) => {
          this.clearSession();
          return of(undefined);
        }),
      );
    } catch (e) {
      this.clearSession();
      return of(undefined);
    }
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http
      .post('http://localhost:8080/api/auth/change-password', {
        currentPassword,
        newPassword,
      })
      .pipe(
        tap(() => {
          this.logout();
        }),
      );
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/staff/login');
  }

  private clearSession(): void {
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    this.currentUser.set(null);
    this.roles.set([]);
  }
}
