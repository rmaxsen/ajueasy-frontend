import api from './client'
import { Demand, Proposal, DemandFilters, PaginatedResponse } from '@/types'

export const demandsApi = {
  list: (filters?: DemandFilters) =>
    api.get<PaginatedResponse<Demand>>('/demands', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Demand>(`/demands/${id}`).then((r) => r.data),

  create: (data: Pick<Demand, 'title' | 'description' | 'specialty' | 'uf' | 'budget'>) =>
    api.post<Demand>('/demands', data).then((r) => r.data),

  close: (id: string) =>
    api.patch<Demand>(`/demands/${id}/close`).then((r) => r.data),

  cancel: (id: string) =>
    api.patch<Demand>(`/demands/${id}/cancel`).then((r) => r.data),

  getProposals: (demandId: string) =>
    api.get<Proposal[]>(`/demands/${demandId}/proposals`).then((r) => r.data),

  sendProposal: (
    demandId: string,
    data: Pick<Proposal, 'description' | 'price' | 'estimatedDays'>
  ) => api.post<Proposal>(`/demands/${demandId}/proposals`, data).then((r) => r.data),

  acceptProposal: (demandId: string, proposalId: string) =>
    api.patch(`/demands/${demandId}/proposals/${proposalId}/accept`).then((r) => r.data),

  rejectProposal: (demandId: string, proposalId: string) =>
    api.patch(`/demands/${demandId}/proposals/${proposalId}/reject`).then((r) => r.data),
}
