import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'
import { _releasePayment } from './payments.routes'
import { parseCnj, resolveTribunalIndex, buscarProcesso } from '../lib/datajud'

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
    numeroProcesso: c.numeroProcesso ?? null,
    tribunalIndex: c.tribunalIndex ?? null,
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

// ─── PATCH /contracts/:id/processo ────────────────────────────────────────────
// Lawyer links a CNJ process number to the contract.
// Automatically creates / updates a ProcessoMonitorado entry for the client.

const processoSchema = z.object({
  numeroProcesso: z.string().min(15, 'Informe o número completo do processo'),
})

router.patch('/:id/processo', authenticate, validateBody(processoSchema), async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.lawyerUserId !== req.user!.id) {
    return res.status(403).json({ error: 'Apenas o advogado do contrato pode vincular um processo' })
  }
  if (!['ACTIVE', 'AWAITING_PAYMENT'].includes(contract.status)) {
    return res.status(409).json({ error: 'Processo só pode ser vinculado em contratos ativos' })
  }

  const { numeroProcesso } = req.body as z.infer<typeof processoSchema>

  const parts = parseCnj(numeroProcesso)
  if (!parts) return res.status(400).json({ error: 'Número de processo inválido. Use o formato CNJ.' })

  const tribunalIndex = resolveTribunalIndex(parts)
  if (!tribunalIndex) {
    return res.status(400).json({
      error: `Tribunal não identificado para o segmento ${parts.segment} / código ${parts.tribunal}.`,
    })
  }

  // Verify process exists on DataJud
  const found = await buscarProcesso(parts.formatted, tribunalIndex).catch((err: Error) => {
    return res.status(400).json({ error: err.message }) as unknown as null
  })
  if (!found) return res.status(404).json({ error: 'Processo não encontrado no DataJud. Verifique o número.' })
  if (!('processo' in found)) return // already responded

  // Save to contract
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { numeroProcesso: parts.formatted, tribunalIndex },
    include: contractInclude,
  })

  // Auto-create ProcessoMonitorado for the client so it appears on their tracking page
  await prisma.processoMonitorado.upsert({
    where: {
      userId_numeroProcesso: {
        userId: contract.clientId,
        numeroProcesso: parts.formatted,
      },
    },
    create: {
      userId: contract.clientId,
      numeroProcesso: parts.formatted,
      tribunalIndex,
      alias: `Contrato #${contract.id.slice(-6)}`,
      lastCheckedAt: new Date(),
    },
    update: {
      lastCheckedAt: new Date(),
    },
  }).catch(() => {}) // non-blocking — client can always add manually

  return res.json(serializeContract(updated))
})

// ─── DELETE /contracts/:id/processo ───────────────────────────────────────────
// Lawyer unlinks the process from the contract.

router.delete('/:id/processo', authenticate, async (req: Request, res: Response) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.lawyerUserId !== req.user!.id) {
    return res.status(403).json({ error: 'Apenas o advogado do contrato pode desvincular o processo' })
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { numeroProcesso: null, tribunalIndex: null },
    include: contractInclude,
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
