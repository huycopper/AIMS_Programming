export interface AdminUserResponse {
  userId: string;
  username: string;
  email: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';
  roles: string[];
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface AdminUsersQueryResult {
  items: AdminUserResponse[];
  page: number;
  limit: number;
  total: number;
}
