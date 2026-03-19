import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { contactGuard } from '../middleware/contactGuard.middleware'
import { uploadDocument } from '../middleware/upload.middleware'
import { paginate, paginatedResponse } from '../lib/paginate'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeRequest(r: any) {
  return {
    id: r.id,
    requesterId: r.requesterId,
    requester: r.requester
      ? {
          id: r.requester.userId,
          name: r.requester.user?.name,
          avatar: r.requester.user?.avatar,
          oabNumber: r.requester.oabNumber,
          oabState: r.requester.oabState,
        }
      : undefined,
    title: r.title,
    description: r.description,
    uf: r.uf,
    city: r.city,
    specialty: r.specialty,
    hearing: r.hearing,
    deadline: r.deadline,
    budget: r.budget,
    status: r.status.toLowerCase(),
    proposalsCount: r.proposalsCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

const requesterInclude = {
  include: { user: { select: { name: true, avatar: true } } },
}

// ─── GET /correspondents/requests ─────────────────────────────────────────────

const listSchema = z.object({
  uf: z.string().optional(),
  specialty: z.string().optional(),
  page: z.string().optional(),
})

router.get('/requests', validateQuery(listSchema), async (req: Request, res: Response) => {
  const { uf, specialty } = req.query as z.infer<typeof listSchema>
  const { skip, take, page, perPage } = paginate(req.query as any)

  const where: any = {
    status: 'OPEN',
    ...(uf && { uf }),
    ...(specialty && { specialty }),
  }

  const [requests, total] = await prisma.$transaction([
    prisma.correspondentRequest.findMany({
      where,
      include: { requester: requesterInclude },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.correspondentRequest.count({ where }),
  ])

  return res.json(paginatedResponse(requests.map(serializeRequest), total, page, perPage))
})

// ─── GET /correspondents/requests/:id ─────────────────────────────────────────

router.get('/requests/:id', async (req: Request, res: Response) => {
  const request = await prisma.correspondentRequest.findUnique({
    where: { id: req.params.id },
    include: { requester: requesterInclude },
  })
  if (!request) return res.status(404).json({ error: 'Pedido não encontrado' })
  return res.json(serializeRequest(request))
})

// ─── POST /correspondents/requests ────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(3000),
  uf: z.string().length(2),
  city: z.string().min(2),
  specialty: z.string().min(1),
  hearing: z.string().datetime().optional(),
  deadline: z.string().datetime(),
  budget: z.number().positive(),
})

router.post(
  '/requests',
  authenticate,
  contactGuard(['description']),
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    if (req.user!.role !== 'LAWYER') {
      return res.status(403).json({ error: 'Apenas advogados podem criar pedidos de correspondente' })
    }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile) return res.status(404).json({ error: 'Perfil de advogado não encontrado' })
    if (profile.status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Apenas advogados verificados podem criar pedidos' })
    }

    const data = req.body as z.infer<typeof createSchema>
    const request = await prisma.correspondentRequest.create({
      data: {
        requesterId: profile.id,
        title: data.title,
        description: data.description,
        uf: data.uf,
        city: data.city,
        specialty: data.specialty,
        hearing: data.hearing ? new Date(data.hearing) : undefined,
        deadline: new Date(data.deadline),
        budget: data.budget,
      },
      include: { requester: requesterInclude },
    })

    return res.status(201).json(serializeRequest(request))
  }
)

// ─── POST /correspondents/requests/:id/proposals ──────────────────────────────

const proposalSchema = z.object({
  description: z.string().min(20).max(3000),
  price: z.number().positive(),
})

router.post(
  '/requests/:id/proposals',
  authenticate,
  contactGuard(['description']),
  validateBody(proposalSchema),
  async (req: Request, res: Response) => {
    if (req.user!.role !== 'LAWYER') {
      return res.status(403).json({ error: 'Apenas advogados podem enviar propostas' })
    }

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' })
    if (profile.status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Apenas advogados verificados podem enviar propostas' })
    }

    const request = await prisma.correspondentRequest.findUnique({ where: { id: req.params.id } })
    if (!request) return res.status(404).json({ error: 'Pedido não encontrado' })
    if (request.status !== 'OPEN') return res.status(409).json({ error: 'Pedido não está aberto' })
    if (request.requesterId === profile.id) {
      return res.status(409).json({ error: 'Não pode enviar proposta para seu próprio pedido' })
    }

    const existing = await prisma.correspondentProposal.findUnique({
      where: { requestId_lawyerId: { requestId: request.id, lawyerId: profile.id } },
    })
    if (existing) return res.status(409).json({ error: 'Você já enviou uma proposta para este pedido' })

    const data = req.body as z.infer<typeof proposalSchema>
    const [proposal] = await prisma.$transaction([
      prisma.correspondentProposal.create({
        data: {
          requestId: request.id,
          lawyerId: profile.id,
          description: data.description,
          price: data.price,
        },
        include: {
          lawyer: {
            include: { user: { select: { name: true, avatar: true } } },
          },
        },
      }),
      prisma.correspondentRequest.update({
        where: { id: request.id },
        data: { proposalsCount: { increment: 1 } },
      }),
    ])

    return res.status(201).json({
      id: proposal.id,
      requestId: proposal.requestId,
      lawyerId: profile.userId,
      lawyer: { name: proposal.lawyer.user?.name, avatar: proposal.lawyer.user?.avatar },
      description: proposal.description,
      price: proposal.price,
      status: proposal.status.toLowerCase(),
      createdAt: proposal.createdAt,
    })
  }
)

// ─── PATCH /correspondents/requests/:id/proposals/:proposalId/accept ──────────

router.patch(
  '/requests/:id/proposals/:proposalId/accept',
  authenticate,
  async (req: Request, res: Response) => {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile) return res.status(403).json({ error: 'Sem permissão' })

    const request = await prisma.correspondentRequest.findUnique({ where: { id: req.params.id } })
    if (!request) return res.status(404).json({ error: 'Pedido não encontrado' })
    if (request.requesterId !== profile.id) return res.status(403).json({ error: 'Sem permissão' })
    if (request.status !== 'OPEN') return res.status(409).json({ error: 'Pedido não está aberto' })

    const proposal = await prisma.correspondentProposal.findFirst({
      where: { id: req.params.proposalId, requestId: request.id, status: 'PENDING' },
    })
    if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' })

    await prisma.$transaction([
      prisma.correspondentProposal.update({ where: { id: proposal.id }, data: { status: 'ACCEPTED' } }),
      prisma.correspondentProposal.updateMany({
        where: { requestId: request.id, id: { not: proposal.id }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      }),
      prisma.correspondentRequest.update({
        where: { id: request.id },
        data: { status: 'IN_PROGRESS' },
      }),
    ])

    return res.json({ message: 'Proposta aceita' })
  }
)

// ─── POST /correspondents/requests/:id/document ───────────────────────────────

router.post(
  '/requests/:id/document',
  authenticate,
  uploadDocument.single('document'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })

    const request = await prisma.correspondentRequest.findUnique({ where: { id: req.params.id } })
    if (!request) return res.status(404).json({ error: 'Pedido não encontrado' })

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile) return res.status(403).json({ error: 'Sem permissão' })

    // Allow requester OR the accepted correspondent
    const acceptedProposal = await prisma.correspondentProposal.findFirst({
      where: { requestId: request.id, lawyerId: profile.id, status: 'ACCEPTED' },
    })
    if (request.requesterId !== profile.id && !acceptedProposal) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    const documentUrl = `/uploads/${req.file.filename}`
    if (acceptedProposal) {
      await prisma.correspondentProposal.update({
        where: { id: acceptedProposal.id },
        data: { documentUrl },
      })
    }

    return res.json({ documentUrl })
  }
)

export default router
