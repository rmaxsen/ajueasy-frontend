import api from './client'
import { KycDocument, Lawyer, User } from '@/types'

export const adminApi = {
  getKycQueue: () =>
    api.get<KycDocument[]>('/admin/kyc/queue').then((r) => r.data),

  approveKyc: (lawyerId: string) =>
    api.patch(`/admin/kyc/${lawyerId}/approve`).then((r) => r.data),

  rejectKyc: (lawyerId: string, note: string) =>
    api.patch(`/admin/kyc/${lawyerId}/reject`, { note }).then((r) => r.data),

  listUsers: (params?: { role?: string; page?: number }) =>
    api.get<User[]>('/admin/users', { params }).then((r) => r.data),

  banUser: (userId: string, reason: string) =>
    api.patch(`/admin/users/${userId}/ban`, { reason }).then((r) => r.data),

  unbanUser: (userId: string) =>
    api.patch(`/admin/users/${userId}/unban`).then((r) => r.data),

  getDenunciations: (params?: { status?: string }) =>
    api.get('/admin/denunciations', { params }).then((r) => r.data),

  resolveDenunciation: (id: string, action: 'warn' | 'ban' | 'dismiss') =>
    api.patch(`/admin/denunciations/${id}/resolve`, { action }).then((r) => r.data),

  getAuditLog: (params?: { page?: number }) =>
    api.get('/admin/audit', { params }).then((r) => r.data),

  getStats: () =>
    api.get('/admin/stats').then((r) => r.data),
}
