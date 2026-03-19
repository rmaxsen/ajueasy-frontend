import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, AlertTriangle, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { contractsApi } from '@/services/api/contracts'
import { Contract } from '@/types'
import { formatDate, formatCurrency, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export default function ContractsPage() {
  const { user } = useAuthStore()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contractsApi.list()
      .then((res) => setContracts(Array.isArray(res) ? res : (res as any).data ?? []))
      .catch(() => setContracts([]))
      .finally(() => setLoading(false))
  }, [])

  const active = contracts.filter((c) => c.status === 'active')
  const completed = contracts.filter((c) => c.status === 'completed')
  const other = contracts.filter((c) => !['active', 'completed'].includes(c.status))

  async function handleComplete(id: string) {
    try {
      await contractsApi.complete(id)
      setContracts((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: 'completed', completedAt: new Date().toISOString() } : c)
      )
    } catch {
      // ignore
    }
  }

  function ContractCard({ contract }: { contract: Contract }) {
    const other = user?.role === 'lawyer' ? contract.client : contract.lawyer
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={(other as any)?.avatar} />
                <AvatarFallback>{other ? getInitials((other as any).name) : '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {user?.role === 'lawyer' ? 'Cliente' : 'Advogado'}: {(other as any)?.name ?? 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Contrato #{contract.id} · {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
            <StatusBadge type="contract" status={contract.status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>💰 {formatCurrency(contract.price)}</span>
            {contract.completedAt && <span>✅ Concluído em {formatDate(contract.completedAt)}</span>}
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/contratos/${contract.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                Ver contrato
              </Link>
            </Button>
            {contract.status === 'active' && user?.role === 'client' && (
              <Button size="sm" onClick={() => handleComplete(contract.id)} className="gap-1">
                <CheckCircle className="h-4 w-4" />
                Marcar concluído
              </Button>
            )}
            {contract.status === 'completed' && user?.role === 'client' && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/avaliar/${contract.id}`}>⭐ Avaliar</Link>
              </Button>
            )}
          </div>
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

      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">Ativos ({active.length})</TabsTrigger>
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
