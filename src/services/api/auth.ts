import api from './client'
import { User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: 'client' | 'lawyer'
}

export interface AuthResponse {
  user: User
  token: string
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  resetPasswordRequest: (email: string) =>
    api.post('/auth/reset-password', { email }).then((r) => r.data),

  resetPasswordConfirm: (token: string, password: string) =>
    api.post('/auth/reset-password/confirm', { token, password }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),
}
