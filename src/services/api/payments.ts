import api from './client'

export interface Payment {
  id: string
  contractId: string
  amount: number
  status: 'pending' | 'paid' | 'released' | 'refunded' | 'disputed'
  invoiceUrl: string | null
  sandboxMode: boolean
  paidAt: string | null
  releasedAt: string | null
  refundedAt: string | null
  createdAt: string
}

export interface AcceptProposalResponse {
  contractId: string
  invoiceUrl: string | null
  message: string
}

export const paymentsApi = {
  /** Get payment details for a contract */
  get: (contractId: string) =>
    api.get<Payment>(`/payments/${contractId}`).then((r) => r.data),

  /** Create / retry invoice generation for a contract (client only) */
  createInvoice: (contractId: string) =>
    api.post<Payment>(`/payments/${contractId}`).then((r) => r.data),

  /**
   * Sandbox only: simulate Iugu confirming payment so the contract moves to ACTIVE.
   * Use this in development/staging to test the full flow without real money.
   */
  simulatePaid: (contractId: string) =>
    api.post<{ ok: boolean; message: string }>(`/payments/${contractId}/simulate-paid`).then((r) => r.data),

  /** Admin: manually release funds to lawyer */
  release: (contractId: string) =>
    api.post<{ ok: boolean; message: string }>(`/payments/${contractId}/release`).then((r) => r.data),

  /** Admin: refund payment to client */
  refund: (contractId: string) =>
    api.post<{ ok: boolean; message: string }>(`/payments/${contractId}/refund`).then((r) => r.data),
}
