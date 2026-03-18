import api from './client'
import { Post, Comment, PaginatedResponse } from '@/types'

export const feedApi = {
  list: (params?: { page?: number; tag?: string }) =>
    api.get<PaginatedResponse<Post>>('/feed', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Post>(`/feed/${id}`).then((r) => r.data),

  create: (data: Pick<Post, 'title' | 'content' | 'tags'> & { image?: File }) => {
    const form = new FormData()
    form.append('title', data.title)
    form.append('content', data.content)
    data.tags.forEach((t) => form.append('tags[]', t))
    if (data.image) form.append('image', data.image)
    return api.post<Post>('/feed', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  like: (id: string) =>
    api.post(`/feed/${id}/like`).then((r) => r.data),

  unlike: (id: string) =>
    api.delete(`/feed/${id}/like`).then((r) => r.data),

  getComments: (postId: string) =>
    api.get<Comment[]>(`/feed/${postId}/comments`).then((r) => r.data),

  addComment: (postId: string, content: string) =>
    api.post<Comment>(`/feed/${postId}/comments`, { content }).then((r) => r.data),
}
