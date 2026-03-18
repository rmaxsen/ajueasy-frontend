import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ContactBlockWarning } from '@/components/shared/ContactBlockWarning'
import { mockDemands, mockLawyers } from '@/services/api/mock-data'
import { Proposal } from '@/types'
import { formatCurrency, timeAgo, detectContactInfo, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const proposalSchema = z.object({
  description: z.string().min(30, 'Mínimo 30 caracteres'),
  price: z.string().min(1, 'Informe o valor'),
  estimatedDays: z.string().min(1, 'Informe o prazo em dias'),
})
type ProposalForm = z.infer<typeof proposalSchema>

export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const demand = mockDemands.find((d) => d.id === id)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [accepted, setAccepted] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
  })
  const descValue = watch('description') ?? ''
  const hasContact = detectContactInfo(descValue)

  if (!demand) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Demanda não encontrada.</p>
        <Button asChild variant="outline"><Link to="/marketplace">Voltar</Link></Button>
      </div>
    )
  }

  const isClient = user?.id === demand.clientId
  const isLawyer = user?.role === 'lawyer'
  const isVerifiedLawyer = isLawyer && (user as any)?.status === 'verified'

  async function onSendProposal(data: ProposalForm) {
    if (hasContact || !demand) return
    await new Promise((r) => setTimeout(r, 800))
    const newProposal: Proposal = {
      id: `pr${Date.now()}`,
      demandId: demand.id,
      lawyerId: user?.id ?? '',
      lawyer: mockLawyers[0],
      description: data.description,
      price: Number(data.price),
      estimatedDays: Number(data.estimatedDays),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setProposals((prev) => [...prev, newProposal])
    setSent(true)
    reset()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/marketplace"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-xl font-bold">{demand.title}</h1>
                <StatusBadge type="demand" status={demand.status} />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{demand.description}</p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Badge variant="outline">{demand.specialty}</Badge>
                <span>📍 {demand.uf}</span>
                {demand.budget && <span>💰 Até {formatCurrency(demand.budget)}</span>}
                <span>🕐 {timeAgo(demand.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Proposals (visible to client) */}
          {isClient && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Propostas recebidas ({proposals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proposals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Aguardando propostas de advogados...
                  </p>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((p) => (
                      <div key={p.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.lawyer?.avatar} />
                            <AvatarFallback>
                              {p.lawyer ? getInitials(p.lawyer.name) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.lawyer?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              OAB/{p.lawyer?.oabState} {p.lawyer?.oabNumber}
                            </p>
                          </div>
                          <StatusBadge type="proposal" status={p.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-semibold">{formatCurrency(p.price)}</span>
                            <span className="text-muted-foreground"> · {p.estimatedDays} dias</span>
                          </div>
                          {accepted === null && demand.status === 'open' && (
                            <Button
                              size="sm"
                              onClick={() => setAccepted(p.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Aceitar
                            </Button>
                          )}
                          {accepted === p.id && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Aceita
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Send proposal (visible to verified lawyers) */}
          {isVerifiedLawyer && demand.status === 'open' && !sent && (
            <Card id="proposta">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviar proposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSendProposal)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Descrição da proposta</Label>
                    <Textarea
                      placeholder="Explique sua abordagem e como pode ajudar o cliente..."
                      rows={5}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-destructive text-xs">{errors.description.message}</p>
                    )}
                    <ContactBlockWarning visible={hasContact} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Valor (R$)</Label>
                      <Input type="number" placeholder="500" {...register('price')} />
                      {errors.price && <p className="text-destructive text-xs">{errors.price.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prazo estimado (dias)</Label>
                      <Input type="number" placeholder="15" {...register('estimatedDays')} />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting || hasContact} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar proposta
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {sent && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-5 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  Proposta enviada com sucesso! Você será notificado quando o cliente responder.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Especialidade</p>
                <p className="font-medium">{demand.specialty}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Estado</p>
                <p className="font-medium">{demand.uf}</p>
              </div>
              {demand.budget && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Orçamento</p>
                    <p className="font-medium">Até {formatCurrency(demand.budget)}</p>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-muted-foreground">Propostas</p>
                <p className="font-medium">{demand.proposalsCount + proposals.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
