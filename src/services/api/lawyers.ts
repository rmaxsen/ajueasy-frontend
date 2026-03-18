import api from './client'
import { Lawyer, PaginatedResponse, LawyerFilters, Review, KycDocument } from '@/types'

export const lawyersApi = {
  list: (filters?: LawyerFilters) =>
    api.get<PaginatedResponse<Lawyer>>('/lawyers', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Lawyer>(`/lawyers/${id}`).then((r) => r.data),

  updateProfile: (id: string, data: Partial<Lawyer>) =>
    api.patch<Lawyer>(`/lawyers/${id}`, data).then((r) => r.data),

  getReviews: (id: string) =>
    api.get<PaginatedResponse<Review>>(`/lawyers/${id}/reviews`).then((r) => r.data),

  uploadKycDocument: (lawyerId: string, type: KycDocument['type'], file: File) => {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    return api.post<KycDocument>(`/lawyers/${lawyerId}/kyc`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  getKycDocuments: (lawyerId: string) =>
    api.get<KycDocument[]>(`/lawyers/${lawyerId}/kyc`).then((r) => r.data),
}
