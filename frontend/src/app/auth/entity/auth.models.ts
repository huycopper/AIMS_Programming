export interface UserProjection {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserProjection;
}
