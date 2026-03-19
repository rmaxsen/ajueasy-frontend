import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JwtPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: string
        lawyerProfileId?: string
        isBanned: boolean
      }
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' })
  }

  const token = authHeader.slice(7)
  let payload: JwtPayload
  try {
    payload = verifyAccessToken(token)
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { lawyerProfile: { select: { id: true } } },
  })

  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' })
  if (user.isBanned) return res.status(403).json({ error: 'Conta suspensa', reason: user.banReason })

  req.user = {
    id: user.id,
    role: user.role,
    lawyerProfileId: user.lawyerProfile?.id,
    isBanned: user.isBanned,
  }

  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente' })
    }
    next()
  }
}

export function requireVerifiedLawyer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
  if (req.user.role !== 'LAWYER') return res.status(403).json({ error: 'Apenas advogados' })
  // LawyerProfile status is checked in the route
  next()
}
