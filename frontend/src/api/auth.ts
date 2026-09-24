import { client } from './client';
import type { AuthResponse, User, RegisterRequest, LoginRequest, ChangePasswordRequest } from '../types';

export async function register(req: RegisterRequest): Promise<AuthResponse> {
  return client.post<AuthResponse>('/api/v1/auth/register', req);
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  return client.post<AuthResponse>('/api/v1/auth/login', req);
}

export async function getMe(): Promise<User> {
  return client.get<User>('/api/v1/auth/me', true);
}

export async function changePassword(req: ChangePasswordRequest): Promise<{ message: string }> {
  return client.post<{ message: string }>('/api/v1/auth/change-password', req, true);
}
