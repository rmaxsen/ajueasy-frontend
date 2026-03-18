import api from './client'
import { CorrespondentRequest, CorrespondentProposal, PaginatedResponse } from '@/types'

export const correspondentsApi = {
  listRequests: (params?: { uf?: string; specialty?: string; page?: number }) =>
    api
      .get<PaginatedResponse<CorrespondentRequest>>('/correspondents/requests', { params })
      .then((r) => r.data),

  getRequest: (id: string) =>
    api.get<CorrespondentRequest>(`/correspondents/requests/${id}`).then((r) => r.data),

  createRequest: (
    data: Pick<
      CorrespondentRequest,
      'title' | 'description' | 'uf' | 'city' | 'specialty' | 'deadline' | 'budget' | 'hearing'
    >
  ) => api.post<CorrespondentRequest>('/correspondents/requests', data).then((r) => r.data),

  sendProposal: (requestId: string, data: { description: string; price: number }) =>
    api
      .post<CorrespondentProposal>(`/correspondents/requests/${requestId}/proposals`, data)
      .then((r) => r.data),

  acceptProposal: (requestId: string, proposalId: string) =>
    api
      .patch(`/correspondents/requests/${requestId}/proposals/${proposalId}/accept`)
      .then((r) => r.data),

  uploadDocument: (requestId: string, file: File) => {
    const form = new FormData()
    form.append('document', file)
    return api
      .post(`/correspondents/requests/${requestId}/document`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
