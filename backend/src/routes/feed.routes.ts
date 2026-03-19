import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { uploadImage } from '../middleware/upload.middleware'
import { paginate, paginatedResponse } from '../lib/paginate'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializePost(p: any, currentUserId?: string) {
  return {
    id: p.id,
    authorId: p.authorId,
    author: p.author
      ? {
          id: p.author.id,
          name: p.author.name,
          avatar: p.author.avatar,
          role: p.author.role,
          oabState: p.author.lawyerProfile?.oabState,
          oabNumber: p.author.lawyerProfile?.oabNumber,
        }
      : undefined,
    title: p.title,
    content: p.content,
    imageUrl: p.imageUrl,
    tags: p.tags,
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    isLiked: currentUserId ? p.likes?.some((l: any) => l.userId === currentUserId) : false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

const authorInclude = {
  select: {
    id: true, name: true, avatar: true, role: true,
    lawyerProfile: { select: { oabState: true, oabNumber: true } },
  },
}

// ─── GET /feed ────────────────────────────────────────────────────────────────

const feedQuerySchema = z.object({
  page: z.string().optional(),
  tag: z.string().optional(),
})

router.get('/', validateQuery(feedQuerySchema), async (req: Request, res: Response) => {
  const { tag } = req.query as z.infer<typeof feedQuerySchema>
  const { skip, take, page, perPage } = paginate(req.query as any)

  // Get current user from optional token
  const authHeader = req.headers.authorization
  let currentUserId: string | undefined
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { verifyAccessToken } = await import('../lib/jwt')
      const payload = verifyAccessToken(authHeader.slice(7))
      currentUserId = payload.userId
    } catch {}
  }

  const where = {
    isPublished: true,
    ...(tag && { tags: { has: tag } }),
  }

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: {
        author: authorInclude,
        likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.post.count({ where }),
  ])

  return res.json(paginatedResponse(posts.map((p) => serializePost(p, currentUserId)), total, page, perPage))
})

// ─── GET /feed/:id ────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { author: authorInclude },
  })
  if (!post || !post.isPublished) return res.status(404).json({ error: 'Post não encontrado' })
  return res.json(serializePost(post))
})

// ─── POST /feed — create post (lawyers only) ──────────────────────────────────

router.post(
  '/',
  authenticate,
  requireRole('LAWYER'),
  uploadImage.single('image'),
  async (req: Request, res: Response) => {
    const { title, content } = req.body
    if (!title || !content) return res.status(422).json({ error: 'Título e conteúdo são obrigatórios' })

    // Only verified lawyers
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!profile || profile.status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Apenas advogados verificados podem publicar artigos' })
    }

    const rawTags = req.body.tags
    let tags: string[] = []
    if (typeof rawTags === 'string') {
      tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
    } else if (Array.isArray(rawTags)) {
      tags = rawTags.flatMap((t: string) => t.split(',').map((x) => x.trim())).filter(Boolean)
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined

    const post = await prisma.post.create({
      data: {
        authorId: req.user!.id,
        title,
        content,
        tags,
        imageUrl,
      },
      include: { author: authorInclude },
    })

    return res.status(201).json(serializePost(post, req.user!.id))
  }
)

// ─── POST /feed/:id/like ──────────────────────────────────────────────────────

router.post('/:id/like', authenticate, async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } })
  if (!post) return res.status(404).json({ error: 'Post não encontrado' })

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: post.id, userId: req.user!.id } },
  })
  if (existing) return res.status(409).json({ error: 'Já curtido' })

  await prisma.$transaction([
    prisma.like.create({ data: { postId: post.id, userId: req.user!.id } }),
    prisma.post.update({ where: { id: post.id }, data: { likesCount: { increment: 1 } } }),
  ])

  return res.status(201).json({ liked: true })
})

// ─── DELETE /feed/:id/like ────────────────────────────────────────────────────

router.delete('/:id/like', authenticate, async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } })
  if (!post) return res.status(404).json({ error: 'Post não encontrado' })

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: post.id, userId: req.user!.id } },
  })
  if (!existing) return res.status(404).json({ error: 'Curtida não encontrada' })

  await prisma.$transaction([
    prisma.like.delete({ where: { id: existing.id } }),
    prisma.post.update({ where: { id: post.id }, data: { likesCount: { decrement: 1 } } }),
  ])

  return res.json({ liked: false })
})

// ─── GET /feed/:id/comments ───────────────────────────────────────────────────

router.get('/:id/comments', async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } })
  if (!post) return res.status(404).json({ error: 'Post não encontrado' })

  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return res.json(comments.map((c) => ({
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    author: c.author,
    content: c.content,
    createdAt: c.createdAt,
  })))
})

// ─── POST /feed/:id/comments ──────────────────────────────────────────────────

const commentSchema = z.object({ content: z.string().min(1).max(1000) })

router.post('/:id/comments', authenticate, validateBody(commentSchema), async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } })
  if (!post) return res.status(404).json({ error: 'Post não encontrado' })

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId: post.id, authorId: req.user!.id, content: req.body.content },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.post.update({ where: { id: post.id }, data: { commentsCount: { increment: 1 } } }),
  ])

  return res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt,
  })
})

export default router
