import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StarRating } from '@/components/shared/StarRating'
import { contractsApi } from '@/services/api/contracts'
import { reviewsApi } from '@/services/api/reviews'
import { Contract } from '@/types'
import { getInitials, formatDate, formatCurrency } from '@/lib/utils'

const schema = z.object({
  comment: z.string().min(10, 'Mínimo 10 caracteres').max(1000),
})
type FormData = z.infer<typeof schema>

export default function ReviewPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [canReview, setCanReview] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [ratingError, setRatingError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!contractId) return
    Promise.all([contractsApi.get(contractId), reviewsApi.canReview(contractId)])
      .then(([contractData, canReviewData]) => {
        setContract(contractData)
        setCanReview(canReviewData.canReview)
      })
      .catch(() => setContract(null))
      .finally(() => setLoading(false))
  }, [contractId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Contrato não encontrado.</p>
        <Button asChild variant="outline"><Link to="/contratos">Voltar</Link></Button>
      </div>
    )
  }

  if (contract.status !== 'completed' || canReview === false) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Avaliação não disponível</h2>
        <p className="text-muted-foreground mb-4">
          {canReview === false
            ? 'Você já avaliou este contrato ou não tem permissão para avaliá-lo.'
            : 'Avaliações só podem ser feitas após a conclusão do contrato.'}
        </p>
        <Button asChild variant="outline"><Link to="/contratos">Ver contratos</Link></Button>
      </div>
    )
  }

  const lawyer = contract.lawyer as any

  async function onSubmit(data: FormData) {
    if (rating === 0) { setRatingError(true); return }
    if (!contractId) return
    setSubmitError(null)
    try {
      await reviewsApi.create(contractId, { rating, comment: data.comment })
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error ?? 'Erro ao enviar avaliação.')
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Avaliação enviada!</h2>
        <p className="text-muted-foreground mb-2">
          Sua avaliação foi registrada como <strong>verificada</strong> por estar vinculada ao contrato.
        </p>
        <Badge variant="success" className="mb-6 gap-1">
          <ShieldCheck className="h-3 w-3" />
          Avaliação verificada
        </Badge>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline"><Link to="/contratos">Ver contratos</Link></Button>
          {lawyer?.id && (
            <Button asChild><Link to={`/advogado/${lawyer.id}`}>Ver perfil do advogado</Link></Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/contratos"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Avaliar serviço</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta avaliação será marcada como verificada por estar vinculada a um contrato concluído.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={lawyer?.avatar} />
              <AvatarFallback>{lawyer ? getInitials(lawyer.name) : '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{lawyer?.name ?? 'Advogado'}</p>
              {lawyer?.oabState && (
                <p className="text-sm text-muted-foreground">OAB/{lawyer.oabState} {lawyer.oabNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Contrato: {formatCurrency(contract.price)} · {formatDate(contract.createdAt)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Sua nota</Label>
              <div className="flex items-center gap-2">
                <StarRating value={rating} onChange={(v) => { setRating(v); setRatingError(false) }} size="lg" />
                <span className="text-lg font-semibold">{rating > 0 ? rating : '—'}</span>
              </div>
              {ratingError && <p className="text-destructive text-xs">Selecione uma nota</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Comentário</Label>
              <Textarea placeholder="Descreva sua experiência com este advogado..." rows={5} {...register('comment')} />
              {errors.comment && <p className="text-destructive text-xs">{errors.comment.message}</p>}
            </div>

            {submitError && <p className="text-destructive text-sm">{submitError}</p>}

            <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-800 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              Esta avaliação será publicada com o selo <strong>Avaliação Verificada</strong>,
              pois está vinculada a um contrato concluído na plataforma.
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar avaliação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
