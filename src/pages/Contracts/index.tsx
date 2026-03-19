import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, AlertTriangle, Eye, Loader2, LinkIcon, Unlink, Scale, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { contractsApi } from '@/services/api/contracts'
import { Contract } from '@/types'
import { formatDate, formatCurrency, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

// ─── Sub-component: process linkage form (lawyer only) ────────────────────────

function LinkProcessoForm({
  contractId,
  onLinked,
}: {
  contractId: string
  onLinked: (contract: Contract) => void
}) {
  const [open, setOpen] = useState(false)
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!numero.trim()) return
    setLoading(true)
    setError('')
    try {
      const updated = await contractsApi.linkProcesso(contractId, numero.trim())
      onLinked(updated)
      setOpen(false)
      setNumero('')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao vincular processo.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
        Vincular processo
      </Button>
    )
  }

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/40 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Vincular número CNJ do processo</p>
        <button onClick={() => { setOpen(false); setError('') }} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        O cliente verá o andamento automaticamente na página de processos.
      </p>
      <div className="flex gap-2">
        <Input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="0000001-68.2019.8.26.0100"
          className="font-mono text-xs h-8"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button size="sm" onClick={handleSubmit} disabled={loading || !numero.trim()}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Vincular'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── Sub-component: linked process display ────────────────────────────────────

function LinkedProcessoBadge({
  contract,
  isLawyer,
  onUnlinked,
}: {
  contract: Contract
  isLawyer: boolean
  onUnlinked: (contract: Contract) => void
}) {
  const [unlinking, setUnlinking] = useState(false)

  async function handleUnlink() {
    setUnlinking(true)
    try {
      const updated = await contractsApi.unlinkProcesso(contract.id)
      onUnlinked(updated)
    } catch {
      // silently fail
    } finally {
      setUnlinking(false)
    }
  }

  if (!contract.numeroProcesso) return null

  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5 text-sm min-w-0">
        <Scale className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="font-mono text-xs text-blue-800 truncate">{contract.numeroProcesso}</span>
      </div>

      {isLawyer ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleUnlink}
          disabled={unlinking}
        >
          <Unlink className="h-3 w-3 mr-1" />
          Desvincular
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <Link to="/processos">
            <Scale className="h-3 w-3 mr-1" />
            Ver andamento processual →
          </Link>
        </Button>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { user } = useAuthStore()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const isLawyer = user?.role === 'lawyer'

  useEffect(() => {
    contractsApi.list()
      .then((res) => setContracts(Array.isArray(res) ? res : (res as any).data ?? []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false))
  }, [])

  function updateContract(updated: Contract) {
    setContracts((prev) => prev.map((c) => c.id === updated.id ? updated : c))
  }

  const active = contracts.filter((c) => c.status === 'active')
  const awaiting = contracts.filter((c) => c.status === 'awaiting_payment')
  const completed = contracts.filter((c) => c.status === 'completed')
  const other = contracts.filter((c) => !['active', 'awaiting_payment', 'completed'].includes(c.status))

  async function handleComplete(id: string) {
    try {
      const updated = await contractsApi.complete(id)
      updateContract(updated)
    } catch {
      // ignore
    }
  }

  function ContractCard({ contract }: { contract: Contract }) {
    const counterpart = isLawyer ? contract.client : contract.lawyer
    const canLinkProcess = isLawyer && contract.status === 'active' && !contract.numeroProcesso

    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={(counterpart as any)?.avatar} />
                <AvatarFallback>{counterpart ? getInitials((counterpart as any).name) : '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {isLawyer ? 'Cliente' : 'Advogado'}: {(counterpart as any)?.name ?? 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Contrato #{contract.id.slice(-8)} · {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
            <StatusBadge type="contract" status={contract.status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>💰 {formatCurrency(contract.price)}</span>
            {contract.completedAt && <span>✅ Concluído em {formatDate(contract.completedAt)}</span>}
          </div>

          {/* Linked process */}
          <LinkedProcessoBadge
            contract={contract}
            isLawyer={isLawyer}
            onUnlinked={updateContract}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/contratos/${contract.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                Ver contrato
              </Link>
            </Button>

            {contract.status === 'active' && !isLawyer && (
              <Button size="sm" onClick={() => handleComplete(contract.id)} className="gap-1">
                <CheckCircle className="h-4 w-4" />
                Marcar concluído
              </Button>
            )}

            {contract.status === 'completed' && !isLawyer && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/avaliar/${contract.id}`}>⭐ Avaliar</Link>
              </Button>
            )}
          </div>

          {/* Process linkage form (lawyer only, active contracts without process) */}
          {canLinkProcess && (
            <LinkProcessoForm
              contractId={contract.id}
              onLinked={updateContract}
            />
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meus Contratos</h1>
        <p className="text-muted-foreground text-sm">Acompanhe o status dos seus contratos jurídicos</p>
      </div>

      <Tabs defaultValue={active.length > 0 ? 'active' : awaiting.length > 0 ? 'awaiting' : 'completed'}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Ativos ({active.length})</TabsTrigger>
          <TabsTrigger value="awaiting">Aguard. pagamento ({awaiting.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger>
          <TabsTrigger value="other">Outros ({other.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {active.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum contrato ativo" description="Seus contratos em andamento aparecerão aqui." />
          ) : (
            <div className="space-y-4">{active.map((c) => <ContractCard key={c.id} contract={c} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="awaiting">
          {awaiting.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum contrato aguardando pagamento" />
          ) : (
            <div className="space-y-4">{awaiting.map((c) => <ContractCard key={c.id} contract={c} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <EmptyState icon={CheckCircle} title="Nenhum contrato concluído" description="Contratos finalizados aparecerão aqui." />
          ) : (
            <div className="space-y-4">{completed.map((c) => <ContractCard key={c.id} contract={c} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="other">
          {other.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Nenhum contrato" />
          ) : (
            <div className="space-y-4">{other.map((c) => <ContractCard key={c.id} contract={c} />)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
