import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { paginate, paginatedResponse } from '../lib/paginate'
import { mailer } from '../lib/mailer'
import { auditLog } from '../lib/audit'

const router = Router()

// All admin routes require authentication and ADMIN role
router.use(authenticate, requireRole('ADMIN'))

// ─── GET /admin/stats ─────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response) => {
  const [users, lawyers, demands, contracts, kycPending, reports] = await prisma.$transaction([
    prisma.user.count(),
    prisma.lawyerProfile.count({ where: { status: 'VERIFIED' } }),
    prisma.demand.count(),
    prisma.contract.count(),
    prisma.lawyerProfile.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
  ])
  return res.json({ users, verifiedLawyers: lawyers, demands, contracts, kycPending, openReports: reports })
})

// ─── KYC Queue ────────────────────────────────────────────────────────────────

router.get('/kyc/queue', async (_req: Request, res: Response) => {
  const profiles = await prisma.lawyerProfile.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      kycDocuments: {
        orderBy: { uploadedAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { user: { createdAt: 'asc' } },
  })

  return res.json(
    profiles.map((p) => ({
      lawyerId: p.userId,
      profileId: p.id,
      name: p.user.name,
      email: p.user.email,
      avatar: p.user.avatar,
      oabNumber: p.oabNumber,
      oabState: p.oabState,
      status: p.status.toLowerCase(),
      submittedAt: p.kycDocuments[0]?.uploadedAt ?? null,
      documents: p.kycDocuments.map((d) => ({
        id: d.id,
        type: d.type.toLowerCase(),
        fileUrl: d.fileUrl,
        status: d.status.toLowerCase(),
        uploadedAt: d.uploadedAt,
      })),
    }))
  )
})

// ─── PATCH /admin/kyc/:lawyerId/approve ───────────────────────────────────────

router.patch('/kyc/:lawyerId/approve', async (req: Request, res: Response) => {
  const { lawyerId } = req.params
  const profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id: lawyerId }, { userId: lawyerId }] },
    include: { user: true },
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })
  if (profile.status === 'VERIFIED') return res.status(409).json({ error: 'Já verificado' })

  await prisma.$transaction([
    prisma.lawyerProfile.update({
      where: { id: profile.id },
      data: { status: 'VERIFIED', isVisible: true },
    }),
    prisma.kycDocument.updateMany({
      where: { lawyerProfileId: profile.id, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: req.user!.id },
    }),
  ])

  await mailer.kycApproved(profile.user.email, profile.user.name)
  await auditLog(req.user!.id, 'KYC aprovado', `${profile.user.name} (${profile.user.email})`)

  return res.json({ message: 'Advogado verificado com sucesso' })
})

// ─── PATCH /admin/kyc/:lawyerId/reject ────────────────────────────────────────

const rejectKycSchema = z.object({
  note: z.string().min(10).max(1000),
})

router.patch('/kyc/:lawyerId/reject', validateBody(rejectKycSchema), async (req: Request, res: Response) => {
  const { lawyerId } = req.params
  const { note } = req.body as z.infer<typeof rejectKycSchema>

  const profile = await prisma.lawyerProfile.findFirst({
    where: { OR: [{ id: lawyerId }, { userId: lawyerId }] },
    include: { user: true },
  })
  if (!profile) return res.status(404).json({ error: 'Advogado não encontrado' })

  await prisma.$transaction([
    prisma.lawyerProfile.update({
      where: { id: profile.id },
      data: { status: 'REJECTED', isVisible: false },
    }),
    prisma.kycDocument.updateMany({
      where: { lawyerProfileId: profile.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      data: { status: 'REJECTED', reviewNote: note, reviewedAt: new Date(), reviewedBy: req.user!.id },
    }),
  ])

  await mailer.kycRejected(profile.user.email, profile.user.name, note)
  await auditLog(req.user!.id, 'KYC rejeitado', `${profile.user.name}`, { note })

  return res.json({ message: 'KYC rejeitado' })
})

// ─── GET /admin/users ─────────────────────────────────────────────────────────

const listUsersSchema = z.object({
  role: z.string().optional(),
  page: z.string().optional(),
})

router.get('/users', validateQuery(listUsersSchema), async (req: Request, res: Response) => {
  const { role } = req.query as z.infer<typeof listUsersSchema>
  const { skip, take, page, perPage } = paginate(req.query as any)

  const where: any = {
    ...(role && { role: role.toUpperCase() }),
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, avatar: true, role: true,
        isBanned: true, banReason: true, createdAt: true,
        lawyerProfile: { select: { status: true, plan: true, oabNumber: true, oabState: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ])

  return res.json(paginatedResponse(users, total, page, perPage))
})

// ─── PATCH /admin/users/:userId/ban ───────────────────────────────────────────

const banSchema = z.object({ reason: z.string().min(5).max(500) })

router.patch('/users/:userId/ban', validateBody(banSchema), async (req: Request, res: Response) => {
  const { userId } = req.params
  const { reason } = req.body as z.infer<typeof banSchema>

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Não pode banir um admin' })

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isBanned: true, banReason: reason } }),
    // Suspend lawyer profile if applicable
    prisma.lawyerProfile.updateMany({
      where: { userId },
      data: { status: 'SUSPENDED', isVisible: false },
    }),
    // Revoke all tokens
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])

  await auditLog(req.user!.id, 'Usuário banido', `${user.name} (${user.email})`, { reason })
  return res.json({ message: 'Usuário banido' })
})

// ─── PATCH /admin/users/:userId/unban ────────────────────────────────────────

router.patch('/users/:userId/unban', async (req: Request, res: Response) => {
  const { userId } = req.params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isBanned: false, banReason: null } }),
    // Restore lawyer to pending for re-review
    prisma.lawyerProfile.updateMany({
      where: { userId, status: 'SUSPENDED' },
      data: { status: 'UNDER_REVIEW' },
    }),
  ])

  await auditLog(req.user!.id, 'Usuário desbanido', `${user.name} (${user.email})`)
  return res.json({ message: 'Usuário desbanido' })
})

// ─── GET /admin/denunciations (reports) ──────────────────────────────────────

const reportsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().optional(),
})

router.get('/denunciations', validateQuery(reportsQuerySchema), async (req: Request, res: Response) => {
  const { status } = req.query as z.infer<typeof reportsQuerySchema>
  const { skip, take, page, perPage } = paginate(req.query as any)

  const where: any = {
    ...(status && { status: status.toUpperCase() }),
  }

  const [reports, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reported: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.report.count({ where }),
  ])

  return res.json(
    paginatedResponse(
      reports.map((r) => ({
        id: r.id,
        type: r.type.toLowerCase(),
        reporter: r.reporter,
        reported: r.reported,
        description: r.description,
        status: r.status.toLowerCase(),
        resolution: r.resolution,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
      total,
      page,
      perPage
    )
  )
})

// ─── PATCH /admin/denunciations/:id/resolve ───────────────────────────────────

const resolveSchema = z.object({
  action: z.enum(['warn', 'ban', 'dismiss']),
  note: z.string().max(1000).optional(),
})

router.patch('/denunciations/:id/resolve', validateBody(resolveSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const { action, note } = req.body as z.infer<typeof resolveSchema>

  const report = await prisma.report.findUnique({
    where: { id },
    include: { reported: true },
  })
  if (!report) return res.status(404).json({ error: 'Denúncia não encontrada' })

  await prisma.report.update({
    where: { id },
    data: {
      status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED',
      resolution: note ?? action,
      resolvedBy: req.user!.id,
      resolvedAt: new Date(),
    },
  })

  if (action === 'ban') {
    await prisma.user.update({
      where: { id: report.reportedId },
      data: { isBanned: true, banReason: note ?? 'Banido por denúncia' },
    })
    await prisma.lawyerProfile.updateMany({
      where: { userId: report.reportedId },
      data: { status: 'SUSPENDED', isVisible: false },
    })
  }

  await auditLog(req.user!.id, `Denúncia ${action}`, `Report #${id} contra ${report.reported.name}`, { action, note })
  return res.json({ message: `Denúncia resolvida com ação: ${action}` })
})

// ─── GET /admin/audit ─────────────────────────────────────────────────────────

router.get('/audit', async (req: Request, res: Response) => {
  const { skip, take, page, perPage } = paginate(req.query as any)

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count(),
  ])

  return res.json(
    paginatedResponse(
      logs.map((l) => ({
        id: l.id,
        action: l.action,
        target: l.target,
        admin: l.admin,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
      total,
      page,
      perPage
    )
  )
})

export default router
