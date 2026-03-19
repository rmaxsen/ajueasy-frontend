import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'
import { _releasePayment } from './payments.routes'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeContract(c: any) {
  return {
    id: c.id,
    demandId: c.demandId,
    demand: c.demand
      ? {
          id: c.demand.id,
          title: c.demand.title,
          specialty: c.demand.specialty,
          uf: c.demand.uf,
        }
      : undefined,
    proposalId: c.proposalId,
    clientId: c.clientId,
    client: c.client
      ? { id: c.client.id, name: c.client.name, avatar: c.client.avatar }
      : undefined,
    lawyerId: c.lawyerUserId,
    lawyer: c.lawyer
      ? { id: c.lawyer.id, name: c.lawyer.name, avatar: c.lawyer.avatar }
      : undefined,
    price: c.price,
    status: c.status.toLowerCase(),
    signedAt: c.signedAt,
    completedAt: c.completedAt,
    createdAt: c.createdAt,
  }
}

const contractInclude = {
  demand: { select: { id: true, title: true, specialty: true, uf: true } },
  client: { select: { id: true, name: true, avatar: true } },
  lawyer: { select: { id: true, name: true, avatar: true } },
}

// ─── GET /contracts ───────────────────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id

  const where =
    req.user!.role === 'ADMIN'
      ? {}
      : {
          OR: [{ clientId: userId }, { lawyerUserId: userId }],
        }

  const contracts = await prisma.contract.findMany({
    where,
    include: contractInclude,
    orderBy: { createdAt: 'desc' },
  })

  return res.json(contracts.map(serializeContract))
})

// ─── GET /contracts/:id ───────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: contractInclude,
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

  return res.json(serializeContract(contract))
})

// ─── PATCH /contracts/:id/complete ────────────────────────────────────────────

router.patch('/:id/complete', authenticate, async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.clientId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })
  if (contract.status !== 'ACTIVE') return res.status(409).json({ error: 'Contrato não está ativo' })

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: contractInclude,
  })

  // Release escrowed funds to the lawyer
  await _releasePayment(contract).catch((err) => {
    console.error('[payment release error]', err)
    // Non-blocking: contract is completed regardless; admin can release manually
  })

  return res.json(serializeContract(updated))
})

// ─── PATCH /contracts/:id/dispute ─────────────────────────────────────────────

const disputeSchema = z.object({ reason: z.string().min(10).max(2000) })

router.patch('/:id/dispute', authenticate, validateBody(disputeSchema), async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })

  const userId = req.user!.id
  if (contract.clientId !== userId && contract.lawyerUserId !== userId) {
    return res.status(403).json({ error: 'Sem permissão' })
  }
  if (!['ACTIVE', 'COMPLETED'].includes(contract.status)) {
    return res.status(409).json({ error: 'Contrato não pode ser disputado' })
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { status: 'DISPUTED' },
    include: contractInclude,
  })

  // Create a report automatically
  const reportedUserId = userId === contract.clientId ? contract.lawyerUserId : contract.clientId
  await prisma.report.create({
    data: {
      reporterId: userId,
      reportedId: reportedUserId,
      type: 'OTHER',
      description: req.body.reason,
    },
  })

  return res.json(serializeContract(updated))
})

// ─── GET /contracts/:id/can-review ────────────────────────────────────────────

router.get('/:id/can-review', authenticate, async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: { review: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })

  const canReview =
    contract.status === 'COMPLETED' &&
    contract.clientId === req.user!.id &&
    !contract.review

  return res.json({ canReview })
})

export default router
