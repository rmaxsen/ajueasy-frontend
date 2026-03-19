/**
 * Marketplace (demands + proposals)
 * Frontend uses /demands as base URL
 */
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { contactGuard } from '../middleware/contactGuard.middleware'
import { paginate, paginatedResponse } from '../lib/paginate'
import { mailer } from '../lib/mailer'
import { createInvoice } from '../lib/iugu'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeDemand(d: any) {
  return {
    id: d.id,
    clientId: d.clientId,
    client: d.client
      ? { id: d.client.id, name: d.client.name, avatar: d.client.avatar, role: d.client.role }
      : undefined,
    title: d.title,
    description: d.description,
    specialty: d.specialty,
    uf: d.uf,
    budget: d.budget,
    status: d.status.toLowerCase(),
    proposalsCount: d.proposalsCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function serializeProposal(p: any) {
  return {
    id: p.id,
    demandId: p.demandId,
    lawyerId: p.lawyer?.userId ?? p.lawyerProfileId,
    lawyer: p.lawyer
      ? {
          id: p.lawyer.userId,
          name: p.lawyer.user?.name,
          avatar: p.lawyer.user?.avatar,
          oabNumber: p.lawyer.oabNumber,
          oabState: p.lawyer.oabState,
          rating: p.lawyer.rating,
        }
      : undefined,
    description: p.description,
    price: p.price,
    estimatedDays: p.estimatedDays,
    status: p.status.toLowerCase(),
    createdAt: p.createdAt,
  }
}

const lawyerInclude = {
  include: {
    user: { select: { name: true, avatar: true } },
  },
}

// ─── GET /demands ─────────────────────────────────────────────────────────────

const listSchema = z.object({
  specialty: z.string().optional(),
  uf: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'closed', 'cancelled']).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const { specialty, uf, status, search } = req.query as z.infer<typeof listSchema>
  const { skip, take, page, perPage } = paginate(req.query as any)

  const where: any = {
    ...(specialty && { specialty }),
    ...(uf && { uf }),
    ...(status && { status: status.toUpperCase() }),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  }

  const [demands, total] = await prisma.$transaction([
    prisma.demand.findMany({
      where,
      include: { client: { select: { id: true, name: true, avatar: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.demand.count({ where }),
  ])

  return res.json(paginatedResponse(demands.map(serializeDemand), total, page, perPage))
})

// ─── GET /demands/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({
    where: { id: req.params.id },
    include: { client: { select: { id: true, name: true, avatar: true, role: true } } },
  })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
  return res.json(serializeDemand(demand))
})

// ─── POST /demands ────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(30).max(5000),
  specialty: z.string().min(1),
  uf: z.string().length(2),
  budget: z.number().positive().optional(),
})

router.post(
  '/',
  authenticate,
  contactGuard(['description']),
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    if (req.user!.role === 'LAWYER') {
      return res.status(403).json({ error: 'Advogados não podem publicar demandas' })
    }

    const data = req.body as z.infer<typeof createSchema>
    const demand = await prisma.demand.create({
      data: { ...data, clientId: req.user!.id },
      include: { client: { select: { id: true, name: true, avatar: true, role: true } } },
    })

    return res.status(201).json(serializeDemand(demand))
  }
)

// ─── PATCH /demands/:id/close ─────────────────────────────────────────────────

router.patch('/:id/close', authenticate, async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
  if (demand.clientId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })

  const updated = await prisma.demand.update({
    where: { id: demand.id },
    data: { status: 'CLOSED' },
  })
  return res.json(serializeDemand(updated))
})

// ─── PATCH /demands/:id/cancel ────────────────────────────────────────────────

router.patch('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
  if (demand.clientId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }
  if (demand.status !== 'OPEN') return res.status(409).json({ error: 'Apenas demandas abertas podem ser canceladas' })

  const updated = await prisma.demand.update({ where: { id: demand.id }, data: { status: 'CANCELLED' } })
  return res.json(serializeDemand(updated))
})

// ─── GET /demands/:id/proposals ───────────────────────────────────────────────

router.get('/:id/proposals', authenticate, async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })

  // Only the client or the lawyer who sent a proposal can see them
  if (req.user!.role === 'CLIENT' && demand.clientId !== req.user!.id) {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const proposals = await prisma.proposal.findMany({
    where: { demandId: demand.id },
    include: { lawyer: { include: { user: { select: { name: true, avatar: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  return res.json(proposals.map(serializeProposal))
})

// ─── POST /demands/:id/proposals ─────────────────────────────────────────────

const proposalSchema = z.object({
  description: z.string().min(30).max(3000),
  price: z.number().positive(),
  estimatedDays: z.number().int().positive(),
})

router.post(
  '/:id/proposals',
  authenticate,
  contactGuard(['description']),
  validateBody(proposalSchema),
  async (req: Request, res: Response) => {
    if (req.user!.role !== 'LAWYER') {
      return res.status(403).json({ error: 'Apenas advogados podem enviar propostas' })
    }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile) return res.status(404).json({ error: 'Perfil de advogado não encontrado' })
    if (profile.status !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Apenas advogados verificados podem enviar propostas',
        status: profile.status.toLowerCase(),
      })
    }

    const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
    if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
    if (demand.status !== 'OPEN') return res.status(409).json({ error: 'Demanda não está aberta' })
    if (demand.clientId === req.user!.id) return res.status(409).json({ error: 'Não pode enviar proposta para sua própria demanda' })

    // Check duplicate
    const existing = await prisma.proposal.findUnique({
      where: { demandId_lawyerProfileId: { demandId: demand.id, lawyerProfileId: profile.id } },
    })
    if (existing) return res.status(409).json({ error: 'Você já enviou uma proposta para esta demanda' })

    const data = req.body as z.infer<typeof proposalSchema>
    const [proposal] = await prisma.$transaction([
      prisma.proposal.create({
        data: { demandId: demand.id, lawyerProfileId: profile.id, ...data },
        include: { lawyer: { include: { user: { select: { name: true, avatar: true } } } } },
      }),
      prisma.demand.update({ where: { id: demand.id }, data: { proposalsCount: { increment: 1 } } }),
    ])

    // Notify client
    const client = await prisma.user.findUnique({ where: { id: demand.clientId } })
    if (client) {
      await mailer.proposalReceived(
        client.email,
        demand.title,
        `${process.env.APP_URL ?? ''}/marketplace/${demand.id}`
      )
    }

    return res.status(201).json(serializeProposal(proposal))
  }
)

// ─── PATCH /demands/:id/proposals/:proposalId/accept ─────────────────────────

router.patch('/:id/proposals/:proposalId/accept', authenticate, async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
  if (demand.clientId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })
  if (demand.status !== 'OPEN') return res.status(409).json({ error: 'Demanda não está aberta' })

  const proposal = await prisma.proposal.findFirst({
    where: { id: req.params.proposalId, demandId: demand.id },
    include: { lawyer: { include: { user: true } } },
  })
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' })
  if (proposal.status !== 'PENDING') return res.status(409).json({ error: 'Proposta não está pendente' })

  const contract = await prisma.$transaction(async (tx) => {
    await tx.proposal.update({ where: { id: proposal.id }, data: { status: 'ACCEPTED' } })
    // Reject other proposals
    await tx.proposal.updateMany({
      where: { demandId: demand.id, id: { not: proposal.id }, status: 'PENDING' },
      data: { status: 'REJECTED' },
    })
    await tx.demand.update({ where: { id: demand.id }, data: { status: 'IN_PROGRESS' } })
    const contract = await tx.contract.create({
      data: {
        demandId: demand.id,
        proposalId: proposal.id,
        clientId: demand.clientId,
        lawyerUserId: proposal.lawyer.userId,
        price: proposal.price,
        signedAt: new Date(),
      },
    })
    return contract
  })

  // Create escrow payment invoice
  const client = await prisma.user.findUnique({ where: { id: demand.clientId } })
  let invoiceUrl: string | null = null
  try {
    const amountCents = Math.round(proposal.price * 100)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const { invoiceId, invoiceUrl: url } = await createInvoice({
      clientEmail: client!.email,
      clientName: client!.name,
      amountCents,
      description: `Ajueasy — pagamento de serviço jurídico (contrato #${contract.id.slice(-8)})`,
      dueDate: dueDateStr,
      contractId: contract.id,
    })

    await prisma.payment.create({
      data: {
        contractId: contract.id,
        iuguInvoiceId: invoiceId,
        iuguInvoiceUrl: url,
        amount: proposal.price,
      },
    })
    invoiceUrl = url
  } catch (err) {
    console.error('[iugu invoice creation error]', err)
    // Non-blocking: client can retry via POST /payments/:contractId
  }

  await mailer.contractCreated(proposal.lawyer.user.email, proposal.price)
  return res.json({
    contractId: contract.id,
    invoiceUrl,
    message: 'Proposta aceita e contrato gerado — aguardando pagamento',
  })
})

// ─── PATCH /demands/:id/proposals/:proposalId/reject ─────────────────────────

router.patch('/:id/proposals/:proposalId/reject', authenticate, async (req: Request, res: Response) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })
  if (demand.clientId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })

  const proposal = await prisma.proposal.findFirst({
    where: { id: req.params.proposalId, demandId: demand.id, status: 'PENDING' },
  })
  if (!proposal) return res.status(404).json({ error: 'Proposta pendente não encontrada' })

  await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'REJECTED' } })
  return res.json({ message: 'Proposta recusada' })
})

export default router
