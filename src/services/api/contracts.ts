import api from './client'
import { Contract } from '@/types'

export const contractsApi = {
  list: () =>
    api.get<Contract[]>('/contracts').then((r) => r.data),

  get: (id: string) =>
    api.get<Contract>(`/contracts/${id}`).then((r) => r.data),

  complete: (id: string) =>
    api.patch<Contract>(`/contracts/${id}/complete`).then((r) => r.data),

  dispute: (id: string, reason: string) =>
    api.patch<Contract>(`/contracts/${id}/dispute`, { reason }).then((r) => r.data),
}
