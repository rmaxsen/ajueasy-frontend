import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { uploadKyc } from '../middleware/upload.middleware'
import { paginate, paginatedResponse } from '../lib/paginate'
import { mailer } from '../lib/mailer'
import path from 'path'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeLawyer(p: any, user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    oabNumber: p.oabNumber,
    oabState: p.oabState,
    status: p.status.toLowerCase(),
    bio: p.bio,
    specialties: p.specialties,
    uf: p.uf,
    city: p.city,
    rating: p.rating,
    reviewCount: p.reviewCount,
    plan: p.plan.toLowerCase(),
    isVisible: p.isVisible,
  }
}

const lawyerInclude = {
  user: {
    select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
  },
}

// ─── GET /lawyers — list/search ───────────────────────────────────────────────

const searchSchema = z.object({
  specialty: z.string().optional(),
  uf: z.string().length(2).optional(),
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  plan: z.enum(['free', 'pro', 'office']).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  perPage: z.string().optional(),
})

router.get('/', validateQuery(searchSchema), async (req: Request, res: Response) => {
  const { specialty, uf, city, minRating, plan, search, ...rest } = req.query as z.infer<typeof searchSchema>
  const { skip, take, page, perPage } = paginate(rest as any)

  const where: any = {
    status: 'VERIFIED',
    isVisible: true,
    ...(specialty && { specialties: { has: specialty } }),
    ...(uf && { uf }),
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
    ...(minRating && { rating: { gte: minRating } }),
    ...(plan && { plan: plan.toUpperCase() }),
    ...(search && {
      user: {
        name: { contains: search, mode: 'insensitive' },
      },
    }),
  }

  const [profiles, total] = await prisma.$transaction([
    prisma.lawyerProfile.findMany({
      where,
      include: lawyerInclude,
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      skip,
      take,
    }),
    prisma.lawyerProfile.count({ where }),
  ])

  const data = profiles.map((p) => serializeLawyer(p, p.user))
  return res.json(paginatedResponse(data, total, page, perPage))
})

// ─── GET /lawyers/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  // id can be userId or lawyerProfileId
  let profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: lawyerInclude,
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })
  return res.json(serializeLawyer(profile, profile.user))
})

// ─── PATCH /lawyers/:id — update profile ─────────────────────────────────────

const updateSchema = z.object({
  bio: z.string().max(500).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  specialties: z.array(z.string()).max(5).optional(),
  uf: z.string().length(2).optional(),
  avatar: z.string().url().optional(),
})

router.patch('/:id', authenticate, validateBody(updateSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })
  if (profile.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const data = req.body as z.infer<typeof updateSchema>
  const updated = await prisma.lawyerProfile.update({
    where: { id: profile.id },
    data: {
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.uf !== undefined && { uf: data.uf }),
    },
    include: lawyerInclude,
  })

  if (data.avatar) {
    await prisma.user.update({ where: { id: profile.userId }, data: { avatar: data.avatar } })
  }

  return res.json(serializeLawyer(updated, updated.user))
})

// ─── GET /lawyers/:id/reviews ─────────────────────────────────────────────────

router.get('/:id/reviews', async (req: Request, res: Response) => {
  const { id } = req.params
  const profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })

  const { skip, take, page, perPage } = paginate(req.query as any)
  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { lawyerUserId: profile.userId },
      include: { reviewer: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.review.count({ where: { lawyerUserId: profile.userId } }),
  ])

  const data = reviews.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    reviewerId: r.reviewerId,
    reviewer: r.reviewer,
    lawyerId: r.lawyerUserId,
    rating: r.rating,
    comment: r.comment,
    isVerified: r.isVerified,
    createdAt: r.createdAt,
  }))

  return res.json(paginatedResponse(data, total, page, perPage))
})

// ─── POST /lawyers/:id/kyc — upload KYC document ─────────────────────────────

const kycTypeMap: Record<string, string> = {
  oab_card: 'OAB_CARD',
  id_document: 'ID_DOCUMENT',
  address_proof: 'ADDRESS_PROOF',
  other: 'OTHER',
}

router.post(
  '/:id/kyc',
  authenticate,
  uploadKyc.single('file'),
  async (req: Request, res: Response) => {
    const { id } = req.params
    const profile = await prisma.lawyerProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
    })
    if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })
    if (profile.userId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })

    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })

    const type = kycTypeMap[req.body?.type as string]
    if (!type) return res.status(422).json({ error: 'Tipo de documento inválido' })

    const fileUrl = `/uploads/${req.file.filename}`
    const doc = await prisma.kycDocument.create({
      data: {
        lawyerProfileId: profile.id,
        type: type as any,
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    })

    // Move lawyer to UNDER_REVIEW if still PENDING
    if (profile.status === 'PENDING') {
      await prisma.lawyerProfile.update({
        where: { id: profile.id },
        data: { status: 'UNDER_REVIEW' },
      })
    }

    return res.status(201).json({
      id: doc.id,
      lawyerId: id,
      type: doc.type.toLowerCase(),
      fileUrl: doc.fileUrl,
      status: doc.status.toLowerCase(),
      uploadedAt: doc.uploadedAt,
    })
  }
)

// ─── GET /lawyers/:id/kyc ─────────────────────────────────────────────────────

router.get('/:id/kyc', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params
  const profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })
  if (profile.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const docs = await prisma.kycDocument.findMany({
    where: { lawyerProfileId: profile.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return res.json(
    docs.map((d) => ({
      id: d.id,
      lawyerId: id,
      type: d.type.toLowerCase(),
      fileUrl: d.fileUrl,
      status: d.status.toLowerCase(),
      reviewNote: d.reviewNote,
      uploadedAt: d.uploadedAt,
      reviewedAt: d.reviewedAt,
    }))
  )
})

export default router
