import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE } from '../../auth/control/auth.service';
import { AdminUserResponse, AdminUsersQuery, AdminUsersQueryResult } from '../entity/admin-user.models';

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  constructor(private readonly http: HttpClient) {}

  getUsersList(query: AdminUsersQuery): Observable<AdminUsersQueryResult> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.role) params = params.set('role', query.role);

    return this.http.get<AdminUsersQueryResult>(`${AIMS_API_BASE}/api/admin/users`, { params });
  }

  getUserDetail(userId: string): Observable<AdminUserResponse> {
    return this.http.get<AdminUserResponse>(`${AIMS_API_BASE}/api/admin/users/${userId}`);
  }

  createUser(payload: {
    username: string;
    email: string;
    roles: string[];
  }): Observable<AdminUserResponse> {
    return this.http.post<AdminUserResponse>(`${AIMS_API_BASE}/api/admin/users`, payload);
  }

  updateUserRoles(userId: string, roles: string[]): Observable<AdminUserResponse> {
    return this.http.put<AdminUserResponse>(`${AIMS_API_BASE}/api/admin/users/${userId}/roles`, { roles });
  }

  updateUserStatus(userId: string, status: string, reason?: string): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${AIMS_API_BASE}/api/admin/users/${userId}/status`, { status, reason });
  }

  triggerPasswordReset(userId: string): Observable<{ userId: string; email: string; resetEmailQueued: boolean }> {
    return this.http.post<{ userId: string; email: string; resetEmailQueued: boolean }>(
      `${AIMS_API_BASE}/api/admin/users/${userId}/password-reset`,
      {}
    );
  }
}
