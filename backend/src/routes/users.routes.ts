import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'

const router = Router()

// ─── GET /users/:id ───────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params
  if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, avatar: true, role: true, createdAt: true,
      lawyerProfile: {
        select: {
          id: true, oabNumber: true, oabState: true, status: true, bio: true,
          specialties: true, uf: true, city: true, plan: true, isVisible: true,
          rating: true, reviewCount: true,
        },
      },
    },
  })

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  return res.json(user)
})

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  avatar: z.string().url().optional(),
})

router.patch('/:id', authenticate, validateBody(updateSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const data = req.body as z.infer<typeof updateSchema>
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, avatar: true, role: true, createdAt: true,
    },
  })
  return res.json(updated)
})

// ─── POST /reports — create a report ─────────────────────────────────────────

const reportSchema = z.object({
  reportedId: z.string().min(1),
  type: z.enum(['contact_info', 'fraud', 'spam', 'abusive_content', 'other']),
  description: z.string().min(10).max(2000),
})

router.post('/reports', authenticate, validateBody(reportSchema), async (req: Request, res: Response) => {
  const { reportedId, type, description } = req.body as z.infer<typeof reportSchema>

  if (reportedId === req.user!.id) {
    return res.status(422).json({ error: 'Não pode denunciar a si mesmo' })
  }

  const reported = await prisma.user.findUnique({ where: { id: reportedId } })
  if (!reported) return res.status(404).json({ error: 'Usuário não encontrado' })

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      reportedId,
      type: type.toUpperCase() as any,
      description,
    },
  })

  return res.status(201).json({
    id: report.id,
    type: report.type.toLowerCase(),
    status: report.status.toLowerCase(),
    createdAt: report.createdAt,
  })
})

export default router
