import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'

const router = Router()

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
})

// ─── POST /contracts/:contractId/review ───────────────────────────────────────

router.post('/:contractId/review', authenticate, validateBody(reviewSchema), async (req: Request, res: Response) => {
  const { contractId } = req.params
  const { rating, comment } = req.body as z.infer<typeof reviewSchema>

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { review: true },
  })
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' })
  if (contract.clientId !== req.user!.id) {
    return res.status(403).json({ error: 'Apenas o cliente pode avaliar' })
  }
  if (contract.status !== 'COMPLETED') {
    return res.status(403).json({
      error: 'Avaliações só podem ser feitas após a conclusão do contrato',
      contractStatus: contract.status.toLowerCase(),
    })
  }
  if (contract.review) {
    return res.status(409).json({ error: 'Este contrato já foi avaliado' })
  }

  const review = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        contractId: contract.id,
        reviewerId: req.user!.id,
        lawyerUserId: contract.lawyerUserId,
        rating,
        comment,
        isVerified: true,
      },
      include: { reviewer: { select: { id: true, name: true, avatar: true } } },
    })

    // Recalculate lawyer rating
    const allReviews = await tx.review.aggregate({
      where: { lawyerUserId: contract.lawyerUserId },
      _avg: { rating: true },
      _count: true,
    })
    await tx.lawyerProfile.updateMany({
      where: { userId: contract.lawyerUserId },
      data: {
        rating: allReviews._avg.rating ?? rating,
        reviewCount: allReviews._count,
      },
    })

    return review
  })

  return res.status(201).json({
    id: review.id,
    contractId: review.contractId,
    reviewerId: review.reviewerId,
    reviewer: review.reviewer,
    lawyerId: review.lawyerUserId,
    rating: review.rating,
    comment: review.comment,
    isVerified: review.isVerified,
    createdAt: review.createdAt,
  })
})

export default router
