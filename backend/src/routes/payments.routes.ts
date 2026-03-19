/**
 * Payments — escrow flow via Iugu
 *
 * Flow:
 *  1. Proposal accepted  → contract (AWAITING_PAYMENT) + payment (PENDING) created
 *  2. Client pays        → Iugu webhook → payment (PAID) + contract (ACTIVE)
 *  3. Service delivered  → PATCH /contracts/:id/complete → payment (RELEASED) → transfer to lawyer
 *  4. Dispute            → admin resolves → refund or release
 *
 * In sandbox mode (no IUGU_API_KEY):
 *  - All Iugu calls are simulated locally (no real money)
 *  - POST /payments/:contractId/simulate-paid lets you test the paid webhook locally
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'
import {
  createInvoice,
  getInvoice,
  refundInvoice,
  transferToLawyer,
  isSandboxMode,
} from '../lib/iugu'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dueDateStr(days = 3) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT ?? '10') // 10% default

function platformFee(amount: number) {
  return Math.round(amount * (PLATFORM_FEE_PCT / 100))
}

function lawyerAmountCents(totalCents: number) {
  return totalCents - platformFee(totalCents)
}

// ─── GET /payments/:contractId ─────────────────────────────────────────────────

router.get('/:contractId', authenticate, async (req: Request, res: Response) => {
  const { contractId } = req.params

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { payment: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })

  const userId = req.user!.id
  if (
    contract.clientId !== userId &&
    contract.lawyerUserId !== userId &&
    req.user!.role !== 'ADMIN'
  ) {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  if (!contract.payment) {
    return res.status(404).json({ error: 'Pagamento não encontrado para este contrato' })
  }

  return res.json({
    id: contract.payment.id,
    contractId: contract.payment.contractId,
    amount: contract.payment.amount,
    status: contract.payment.status.toLowerCase(),
    invoiceUrl: contract.payment.iuguInvoiceUrl,
    sandboxMode: isSandboxMode,
    paidAt: contract.payment.paidAt,
    releasedAt: contract.payment.releasedAt,
    refundedAt: contract.payment.refundedAt,
    createdAt: contract.payment.createdAt,
  })
})

// ─── POST /payments/:contractId ────────────────────────────────────────────────
// Creates a new Iugu invoice for a contract in AWAITING_PAYMENT status.
// Called internally by marketplace route (accept proposal) — exposed here for
// retry if invoice creation failed.

router.post('/:contractId', authenticate, async (req: Request, res: Response) => {
  const { contractId } = req.params

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { client: true, payment: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.clientId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })
  if (contract.status !== 'AWAITING_PAYMENT') {
    return res.status(409).json({ error: 'Contrato não está aguardando pagamento' })
  }
  if (contract.payment?.status === 'PAID') {
    return res.status(409).json({ error: 'Este contrato já foi pago' })
  }

  const amountCents = Math.round(contract.price * 100)

  const { invoiceId, invoiceUrl } = await createInvoice({
    clientEmail: contract.client.email,
    clientName: contract.client.name,
    amountCents,
    description: `Ajueasy — pagamento de serviço jurídico (contrato #${contract.id.slice(-8)})`,
    dueDate: dueDateStr(3),
    contractId: contract.id,
  })

  const payment = await prisma.payment.upsert({
    where: { contractId: contract.id },
    create: {
      contractId: contract.id,
      iuguInvoiceId: invoiceId,
      iuguInvoiceUrl: invoiceUrl,
      amount: contract.price,
    },
    update: {
      iuguInvoiceId: invoiceId,
      iuguInvoiceUrl: invoiceUrl,
    },
  })

  return res.status(201).json({
    id: payment.id,
    amount: payment.amount,
    status: payment.status.toLowerCase(),
    invoiceUrl: payment.iuguInvoiceUrl,
    sandboxMode: isSandboxMode,
  })
})

// ─── POST /payments/webhook ────────────────────────────────────────────────────
// Iugu calls this when a payment is confirmed.
// In production, validate the Iugu signature before processing.

router.post('/webhook', async (req: Request, res: Response) => {
  const { event, data } = req.body as {
    event?: string
    data?: { id?: string; custom_variables?: Array<{ name: string; value: string }> }
  }

  // Only process payment confirmation events
  if (event !== 'invoice.status_changed' && event !== 'invoice.paid') {
    return res.json({ ok: true })
  }

  const invoiceId = data?.id
  if (!invoiceId) return res.status(400).json({ error: 'Missing invoice id' })

  // Find contract via custom_variable or by matching invoice ID
  const customVars = data?.custom_variables ?? []
  const contractIdVar = customVars.find((v) => v.name === 'contract_id')?.value

  const payment = contractIdVar
    ? await prisma.payment.findUnique({ where: { contractId: contractIdVar } })
    : await prisma.payment.findFirst({ where: { iuguInvoiceId: invoiceId } })

  if (!payment) return res.status(404).json({ error: 'Payment not found' })

  // Verify status with Iugu
  const invoice = await getInvoice(invoiceId)
  if (invoice.status !== 'paid') return res.json({ ok: true, note: 'not paid yet' })

  // Activate contract
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.contract.update({
      where: { id: payment.contractId },
      data: { status: 'ACTIVE', signedAt: new Date() },
    }),
  ])

  return res.json({ ok: true })
})

// ─── POST /payments/:contractId/simulate-paid ──────────────────────────────────
// Sandbox only: simulate Iugu confirming a payment (for testing purposes)

router.post('/:contractId/simulate-paid', authenticate, async (req: Request, res: Response) => {
  if (!isSandboxMode) {
    return res.status(403).json({ error: 'Apenas disponível em modo sandbox' })
  }

  const { contractId } = req.params
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { payment: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.clientId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }
  if (!contract.payment) return res.status(404).json({ error: 'Pagamento não encontrado' })
  if (contract.payment.status !== 'PENDING') {
    return res.status(409).json({ error: 'Pagamento não está pendente' })
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: contract.payment.id },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: { status: 'ACTIVE', signedAt: new Date() },
    }),
  ])

  return res.json({ ok: true, message: 'Pagamento simulado com sucesso — contrato agora ATIVO' })
})

// ─── POST /payments/:contractId/release ───────────────────────────────────────
// Admin-only: manually release funds to lawyer (normally triggered by /contracts/:id/complete)

router.post(
  '/:contractId/release',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    const { contractId } = req.params
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { payment: true, lawyer: true },
    })
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
    if (!contract.payment) return res.status(404).json({ error: 'Pagamento não encontrado' })
    if (contract.payment.status !== 'PAID') {
      return res.status(409).json({ error: 'Pagamento não está PAID' })
    }

    await _releasePayment(contract)
    return res.json({ ok: true, message: 'Pagamento liberado para o advogado' })
  }
)

// ─── POST /payments/:contractId/refund ────────────────────────────────────────
// Admin-only: refund to client (e.g. after dispute resolution)

router.post(
  '/:contractId/refund',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response) => {
    const { contractId } = req.params
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { payment: true },
    })
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
    if (!contract.payment) return res.status(404).json({ error: 'Pagamento não encontrado' })
    if (!['PAID', 'DISPUTED'].includes(contract.payment.status)) {
      return res.status(409).json({ error: 'Pagamento não pode ser estornado' })
    }

    if (contract.payment.iuguInvoiceId) {
      await refundInvoice(contract.payment.iuguInvoiceId)
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: contract.payment.id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      }),
      prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'CANCELLED' },
      }),
    ])

    return res.json({ ok: true, message: 'Estorno realizado ao cliente' })
  }
)

// ─── Shared release logic ──────────────────────────────────────────────────────
// Called by /complete route in contracts.routes.ts via this export

export async function _releasePayment(contract: {
  id: string
  price: number
  lawyerUserId: string
  payment: { id: string; iuguInvoiceId: string | null } | null
}) {
  if (!contract.payment) return

  const amountCents = Math.round(contract.price * 100)

  // Try to find lawyer's Iugu sub-account
  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: contract.lawyerUserId },
    select: { iuguSubAccountId: true },
  })

  if (lawyerProfile?.iuguSubAccountId && !isSandboxMode) {
    const netCents = lawyerAmountCents(amountCents)
    await transferToLawyer({
      receiverAccountId: lawyerProfile.iuguSubAccountId,
      amountCents: netCents,
      description: `Repasse Ajueasy — contrato #${contract.id.slice(-8)}`,
    })
  }
  // If no sub-account yet: funds stay on the platform (admin releases manually later)

  await prisma.payment.update({
    where: { id: contract.payment.id },
    data: { status: 'RELEASED', releasedAt: new Date() },
  })
}

export default router
