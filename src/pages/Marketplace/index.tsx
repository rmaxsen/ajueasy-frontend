import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, Search, Filter, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ContactBlockWarning } from '@/components/shared/ContactBlockWarning'
import { mockDemands } from '@/services/api/mock-data'
import { Demand } from '@/types'
import { SPECIALTIES, UF_LIST, formatDate, formatCurrency, detectContactInfo, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const createSchema = z.object({
  title: z.string().min(10, 'Mínimo 10 caracteres'),
  description: z.string().min(30, 'Mínimo 30 caracteres').max(2000),
  specialty: z.string().min(1, 'Selecione uma especialidade'),
  uf: z.string().length(2, 'Selecione um estado'),
  budget: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export default function MarketplacePage() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [demands, setDemands] = useState<Demand[]>(mockDemands)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const descriptionValue = watch('description') ?? ''
  const hasContactInfo = detectContactInfo(descriptionValue)

  const filtered = demands.filter((d) => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function onCreate(data: CreateForm) {
    if (hasContactInfo) return
    await new Promise((r) => setTimeout(r, 800))
    const newDemand: Demand = {
      id: `d${Date.now()}`,
      clientId: user?.id ?? '',
      title: data.title,
      description: data.description,
      specialty: data.specialty,
      uf: data.uf,
      budget: data.budget ? Number(data.budget) : undefined,
      status: 'open',
      proposalsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setDemands((prev) => [newDemand, ...prev])
    reset()
    setCreateOpen(false)
  }

  // Advogado não verificado não pode enviar propostas
  const isLawyerUnverified =
    user?.role === 'lawyer' && (user as any).status !== 'verified'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Jurídico</h1>
          <p className="text-muted-foreground text-sm">
            {user?.role === 'lawyer'
              ? 'Encontre demandas de clientes que precisam de sua expertise'
              : 'Publique sua demanda e receba propostas de advogados verificados'}
          </p>
        </div>
        {isAuthenticated && user?.role === 'client' && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova demanda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Publicar demanda</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título da demanda</Label>
                  <Input placeholder="Ex: Assessoria em rescisão trabalhista" {...register('title')} />
                  {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição detalhada</Label>
                  <Textarea
                    placeholder="Descreva sua situação com detalhes relevantes..."
                    rows={5}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-destructive text-xs">{errors.description.message}</p>
                  )}
                  <ContactBlockWarning visible={hasContactInfo} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Especialidade</Label>
                    <Select onValueChange={(v) => setValue('specialty', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.specialty && <p className="text-destructive text-xs">{errors.specialty.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado (UF)</Label>
                    <Select onValueChange={(v) => setValue('uf', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Orçamento estimado (R$) — opcional</Label>
                  <Input type="number" placeholder="500" {...register('budget')} />
                </div>
                <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-800">
                  Após publicar, advogados verificados poderão enviar propostas. Você escolhe com quem fechar.
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || hasContactInfo}>
                    Publicar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLawyerUnverified && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Conta em análise</p>
            <p className="text-sm text-amber-700">
              Seu perfil ainda está sendo verificado. Você poderá enviar propostas após a aprovação.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar demandas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Aberta</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="closed">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma demanda encontrada"
          description="Tente ajustar os filtros ou seja o primeiro a publicar uma demanda."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <Card key={d.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/marketplace/${d.id}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {d.title}
                      </Link>
                      <StatusBadge type="demand" status={d.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{d.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{d.specialty}</Badge>
                      <span>📍 {d.uf}</span>
                      {d.budget && <span>💰 Até {formatCurrency(d.budget)}</span>}
                      <span>📝 {d.proposalsCount} proposta{d.proposalsCount !== 1 ? 's' : ''}</span>
                      <span>🕐 {timeAgo(d.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/marketplace/${d.id}`}>Ver detalhes</Link>
                    </Button>
                    {user?.role === 'lawyer' && d.status === 'open' && !isLawyerUnverified && (
                      <Button size="sm" asChild>
                        <Link to={`/marketplace/${d.id}#proposta`}>Enviar proposta</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
