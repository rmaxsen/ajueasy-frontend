import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, ShieldAlert, Users, FileText, Activity, Ban, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth'
import { adminApi } from '@/services/api/admin'
import { getInitials, formatDate } from '@/lib/utils'
import { Navigate } from 'react-router-dom'

export default function AdminPage() {
  const { user } = useAuthStore()
  const [kycQueue, setKycQueue] = useState<any[]>([])
  const [denunciations, setDenunciations] = useState<any[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  if (user?.role !== 'admin') {
    return <Navigate to="/" />
  }

  useEffect(() => {
    Promise.all([
      adminApi.getKycQueue(),
      adminApi.getDenunciations({ status: 'pending' }),
      adminApi.getAuditLog(),
      adminApi.getStats(),
    ])
      .then(([kyc, dens, audit, statsData]) => {
        setKycQueue(Array.isArray(kyc) ? kyc : (kyc as any).data ?? [])
        setDenunciations(Array.isArray(dens) ? dens : (dens as any).data ?? [])
        setAuditLog(Array.isArray(audit) ? audit : (audit as any).data ?? [])
        setStats(statsData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function approveKyc(lawyerId: string) {
    setProcessingId(lawyerId)
    try {
      await adminApi.approveKyc(lawyerId)
      setKycQueue((prev) => prev.map((k) => k.lawyerId === lawyerId ? { ...k, status: 'approved' } : k))
    } catch {
      // ignore
    } finally {
      setProcessingId(null)
    }
  }

  async function rejectKyc(lawyerId: string) {
    setProcessingId(lawyerId)
    try {
      await adminApi.rejectKyc(lawyerId, rejectNote)
      setKycQueue((prev) => prev.map((k) => k.lawyerId === lawyerId ? { ...k, status: 'rejected' } : k))
      setRejectTarget(null)
      setRejectNote('')
    } catch {
      // ignore
    } finally {
      setProcessingId(null)
    }
  }

  async function resolveDenunciation(id: string, action: 'warn' | 'ban' | 'dismiss') {
    try {
      await adminApi.resolveDenunciation(id, action)
      setDenunciations((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // ignore
    }
  }

  const pending = kycQueue.filter((k) => k.status === 'pending' || k.status === 'UNDER_REVIEW')

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
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground text-sm">Gestão de KYC, denúncias e auditoria</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Usuários totais', value: stats?.totalUsers ?? '—' },
          { icon: FileText, label: 'KYC pendentes', value: stats?.pendingKyc ?? pending.length },
          { icon: ShieldAlert, label: 'Denúncias abertas', value: stats?.openReports ?? denunciations.length },
          { icon: Activity, label: 'Advogados verificados', value: stats?.verifiedLawyers ?? '—' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="kyc">
        <TabsList className="mb-6">
          <TabsTrigger value="kyc">Fila KYC ({pending.length})</TabsTrigger>
          <TabsTrigger value="denunciations">Denúncias ({denunciations.length})</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc">
          <div className="space-y-4">
            {kycQueue.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">Nenhum KYC pendente. 🎉</CardContent>
              </Card>
            )}
            {kycQueue.map((item) => (
              <Card key={item.lawyerId ?? item.id} className={item.status !== 'pending' && item.status !== 'UNDER_REVIEW' ? 'opacity-60' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(item.name ?? item.lawyer?.name ?? 'A')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{item.name ?? item.lawyer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        OAB/{item.oabState ?? item.lawyer?.oabState} {item.oabNumber ?? item.lawyer?.oabNumber}
                        {item.submittedAt && ` · Enviado em ${formatDate(item.submittedAt)}`}
                      </p>
                    </div>
                    <Badge variant={
                      item.status === 'VERIFIED' || item.status === 'approved' ? 'success'
                        : item.status === 'REJECTED' || item.status === 'rejected' ? 'destructive'
                          : 'warning'
                    }>
                      {item.status === 'VERIFIED' || item.status === 'approved' ? 'Aprovado'
                        : item.status === 'REJECTED' || item.status === 'rejected' ? 'Rejeitado'
                          : 'Pendente'}
                    </Badge>
                    {(item.status === 'pending' || item.status === 'UNDER_REVIEW') && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver docs
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={processingId === (item.lawyerId ?? item.id)}
                          onClick={() => approveKyc(item.lawyerId ?? item.id)}
                        >
                          {processingId === (item.lawyerId ?? item.id)
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCircle className="h-4 w-4" />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => setRejectTarget(item.lawyerId ?? item.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="denunciations">
          <div className="space-y-4">
            {denunciations.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">Nenhuma denúncia pendente. ✅</CardContent>
              </Card>
            )}
            {denunciations.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="warning">{d.type === 'contact_info' ? 'Contato direto' : 'Fraude'}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium">
                        {d.reporter?.name ?? 'Usuário'} denunciou {d.reported?.name ?? 'Usuário'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => resolveDenunciation(d.id, 'warn')}>Advertir</Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => resolveDenunciation(d.id, 'ban')}>
                        <Ban className="h-3 w-3" />
                        Banir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveDenunciation(d.id, 'dismiss')}>Dispensar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log de auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma ação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          Por {entry.admin?.name ?? entry.adminId} · Alvo: {entry.target ?? entry.targetId}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição. O advogado receberá um e-mail com a justificativa.
            </p>
            <Textarea
              placeholder="Ex: Documento ilegível, informações inconsistentes..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={!rejectNote.trim() || !!processingId}
              onClick={() => rejectTarget && rejectKyc(rejectTarget)}
            >
              {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
