export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  currency: string;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}
