export interface PaginationParams {
  page?: number
  perPage?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export function paginate(query: { page?: string; perPage?: string }): { skip: number; take: number; page: number; perPage: number } {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(query.perPage ?? '20', 10)))
  return { skip: (page - 1) * perPage, take: perPage, page, perPage }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, perPage: number): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}
