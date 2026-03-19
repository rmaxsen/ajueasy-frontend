import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  refreshTokenExpiry,
  resetTokenExpiry,
} from '../lib/jwt'
import { validateBody } from '../middleware/validate.middleware'
import { authenticate } from '../middleware/auth.middleware'
import { mailer } from '../lib/mailer'

const router = Router()

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role: z.enum(['CLIENT', 'LAWYER']).default('CLIENT'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
})

const resetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeUser(user: {
  id: string; name: string; email: string; avatar: string | null
  role: string; createdAt: Date
  lawyerProfile?: {
    id: string; oabNumber: string; oabState: string; status: string
    bio: string | null; specialties: string[]; uf: string; city: string
    rating: number; reviewCount: number; plan: string; isVisible: boolean
  } | null
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    ...(user.lawyerProfile && {
      oabNumber: user.lawyerProfile.oabNumber,
      oabState: user.lawyerProfile.oabState,
      status: user.lawyerProfile.status,
      bio: user.lawyerProfile.bio,
      specialties: user.lawyerProfile.specialties,
      uf: user.lawyerProfile.uf,
      city: user.lawyerProfile.city,
      rating: user.lawyerProfile.rating,
      reviewCount: user.lawyerProfile.reviewCount,
      plan: user.lawyerProfile.plan,
      isVisible: user.lawyerProfile.isVisible,
    }),
  }
}

const lawyerProfileSelect = {
  id: true, oabNumber: true, oabState: true, status: true,
  bio: true, specialties: true, uf: true, city: true,
  rating: true, reviewCount: true, plan: true, isVisible: true,
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as z.infer<typeof registerSchema>

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'E-mail já cadastrado' })

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hash, role },
    include: { lawyerProfile: { select: lawyerProfileSelect } },
  })

  const token = signAccessToken({ userId: user.id, role: user.role })
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role })
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: refreshTokenExpiry() },
  })

  return res.status(201).json({ user: serializeUser(user), token, refreshToken })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>

  const user = await prisma.user.findUnique({
    where: { email },
    include: { lawyerProfile: { select: lawyerProfileSelect } },
  })
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })
  if (user.isBanned) return res.status(403).json({ error: 'Conta suspensa', reason: user.banReason })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

  const token = signAccessToken({ userId: user.id, role: user.role })
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role })
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: refreshTokenExpiry() },
  })

  return res.json({ user: serializeUser(user), token, refreshToken })
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {}
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token ausente' })

  let payload: { userId: string; role: string }
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido' })
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token expirado' })
  }

  // Rotate
  await prisma.refreshToken.delete({ where: { id: stored.id } })
  const newToken = signAccessToken(payload)
  const newRefresh = signRefreshToken(payload)
  await prisma.refreshToken.create({
    data: { userId: payload.userId, token: newRefresh, expiresAt: refreshTokenExpiry() },
  })

  return res.json({ token: newToken, refreshToken: newRefresh })
})

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { lawyerProfile: { select: lawyerProfileSelect } },
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  return res.json(serializeUser(user))
})

// ─── POST /auth/reset-password ────────────────────────────────────────────────

router.post('/reset-password', validateBody(resetRequestSchema), async (req: Request, res: Response) => {
  const { email } = req.body as z.infer<typeof resetRequestSchema>

  const user = await prisma.user.findUnique({ where: { email } })
  // Always return 200 to avoid user enumeration
  if (!user) return res.json({ message: 'Se o e-mail existir, você receberá as instruções.' })

  // Invalidate existing tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const token = generateResetToken()
  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt: resetTokenExpiry() },
  })

  const resetUrl = `${process.env.APP_URL ?? 'http://localhost:5173'}/nova-senha?token=${token}`
  await mailer.passwordReset(email, resetUrl)

  return res.json({ message: 'Se o e-mail existir, você receberá as instruções.' })
})

// ─── POST /auth/reset-password/confirm ───────────────────────────────────────

router.post('/reset-password/confirm', validateBody(resetConfirmSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body as z.infer<typeof resetConfirmSchema>

  const reset = await prisma.passwordReset.findUnique({ where: { token } })
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Token inválido ou expirado' })
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { password: hash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    // Invalidate all refresh tokens
    prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
  ])

  return res.json({ message: 'Senha redefinida com sucesso' })
})

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {}
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }
  return res.json({ message: 'Sessão encerrada' })
})

export default router
