import api from './client'
import { Review } from '@/types'

export const reviewsApi = {
  create: (contractId: string, data: { rating: number; comment: string }) =>
    api.post<Review>(`/contracts/${contractId}/review`, data).then((r) => r.data),

  canReview: (contractId: string) =>
    api.get<{ canReview: boolean }>(`/contracts/${contractId}/can-review`).then((r) => r.data),
}
