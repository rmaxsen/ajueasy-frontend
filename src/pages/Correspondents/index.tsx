import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, MapPin, Calendar, DollarSign, Loader2, CheckCircle } from 'lucide-react'
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
import { mockCorrespondentRequests } from '@/services/api/mock-data'
import { CorrespondentRequest } from '@/types'
import { SPECIALTIES, UF_LIST, formatCurrency, formatDate, timeAgo, detectContactInfo } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  uf: z.string().length(2),
  city: z.string().min(2),
  specialty: z.string().min(1),
  hearing: z.string().optional(),
  deadline: z.string().min(1),
  budget: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function CorrespondentsPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [requests, setRequests] = useState<CorrespondentRequest[]>(mockCorrespondentRequests)
  const [createOpen, setCreateOpen] = useState(false)
  const [filterUf, setFilterUf] = useState('all')
  const [search, setSearch] = useState('')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const descValue = watch('description') ?? ''
  const hasContact = detectContactInfo(descValue)

  const filtered = requests.filter((r) => {
    if (filterUf !== 'all' && r.uf !== filterUf) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const isLawyerVerified = user?.role === 'lawyer' && (user as any).status === 'verified'

  async function onCreate(data: FormData) {
    if (hasContact) return
    await new Promise((r) => setTimeout(r, 800))
    const newReq: CorrespondentRequest = {
      id: `cr${Date.now()}`,
      requesterId: user?.id ?? '',
      title: data.title,
      description: data.description,
      uf: data.uf,
      city: data.city,
      specialty: data.specialty,
      hearing: data.hearing || undefined,
      deadline: data.deadline,
      budget: Number(data.budget),
      status: 'open',
      proposalsCount: 0,
      createdAt: new Date().toISOString(),
    }
    setRequests((prev) => [newReq, ...prev])
    reset()
    setCreateOpen(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Correspondentes Jurídicos</h1>
          <p className="text-muted-foreground text-sm">
            Encontre ou ofereça correspondência em todo o Brasil
          </p>
        </div>
        {isLawyerVerified && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar pedido de correspondente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input placeholder="Ex: Audiência trabalhista — 15/04" {...register('title')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea placeholder="Detalhes do ato, processo, vara, etc." rows={4} {...register('description')} />
                  <ContactBlockWarning visible={hasContact} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>UF</Label>
                    <Select onValueChange={(v) => setValue('uf', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input placeholder="Cidade" {...register('city')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Especialidade</Label>
                  <Select onValueChange={(v) => setValue('specialty', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data da audiência</Label>
                    <Input type="datetime-local" {...register('hearing')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prazo limite</Label>
                    <Input type="date" {...register('deadline')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input type="number" placeholder="300" {...register('budget')} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || hasContact}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publicar pedido
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar pedidos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterUf} onValueChange={setFilterUf}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhum pedido encontrado"
          description="Nenhum pedido de correspondente disponível com esses filtros."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{r.title}</h3>
                      <StatusBadge type="demand" status={r.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{r.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {r.city}/{r.uf}
                      </span>
                      <Badge variant="outline" className="text-xs">{r.specialty}</Badge>
                      {r.hearing && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Audiência: {formatDate(r.hearing, 'dd/MM/yyyy HH:mm')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(r.budget)}
                      </span>
                      <span>📝 {r.proposalsCount} proposta(s)</span>
                      <span>🕐 {timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/correspondentes/${r.id}`}>Ver detalhes</Link>
                    </Button>
                    {isLawyerVerified && r.status === 'open' && (
                      <Button size="sm">Enviar proposta</Button>
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
