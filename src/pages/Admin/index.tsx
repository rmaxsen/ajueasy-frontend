import { useState } from 'react'
import { CheckCircle, XCircle, Eye, ShieldAlert, Users, FileText, Activity, Ban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth'
import { mockLawyers } from '@/services/api/mock-data'
import { getInitials, formatDate } from '@/lib/utils'
import { Navigate } from 'react-router-dom'

type KycItem = { lawyerId: string; name: string; oabNumber: string; oabState: string; avatar?: string; submittedAt: string; status: 'pending' | 'approved' | 'rejected' }

const initialKycQueue: KycItem[] = mockLawyers
  .filter((l) => l.status === 'pending' || l.status === 'under_review')
  .map((l) => ({
    lawyerId: l.id,
    name: l.name,
    oabNumber: l.oabNumber,
    oabState: l.oabState,
    avatar: l.avatar,
    submittedAt: l.createdAt,
    status: 'pending',
  }))

const denunciations = [
  { id: 'den1', type: 'contact_info', reporter: 'Cliente A', reported: 'Dr. X', description: 'Tentativa de fornecer WhatsApp na proposta', createdAt: '2024-03-10T10:00:00Z', status: 'pending' },
  { id: 'den2', type: 'fraud', reporter: 'Cliente B', reported: 'Dr. Y', description: 'Perfil falso com foto de terceiro', createdAt: '2024-03-11T14:00:00Z', status: 'pending' },
]

const auditLog = [
  { id: 'a1', action: 'KYC aprovado', user: 'admin@ajueasy.com', target: 'Dr. Carlos Mendes', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'a2', action: 'Usuário banido', user: 'admin@ajueasy.com', target: 'user@test.com', createdAt: '2024-03-14T16:00:00Z' },
  { id: 'a3', action: 'Denúncia resolvida', user: 'admin@ajueasy.com', target: 'Denúncia #den3', createdAt: '2024-03-13T11:00:00Z' },
]

export default function AdminPage() {
  const { user } = useAuthStore()
  const [kycQueue, setKycQueue] = useState<KycItem[]>(initialKycQueue)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  if (user?.role !== 'admin') {
    return <Navigate to="/" />
  }

  function approveKyc(lawyerId: string) {
    setKycQueue((prev) => prev.map((k) => k.lawyerId === lawyerId ? { ...k, status: 'approved' } : k))
  }

  function rejectKyc(lawyerId: string) {
    setKycQueue((prev) => prev.map((k) => k.lawyerId === lawyerId ? { ...k, status: 'rejected' } : k))
    setRejectTarget(null)
    setRejectNote('')
  }

  const pending = kycQueue.filter((k) => k.status === 'pending')
  const reviewed = kycQueue.filter((k) => k.status !== 'pending')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground text-sm">Gestão de KYC, denúncias e auditoria</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Usuários totais', value: '5.240' },
          { icon: FileText, label: 'KYC pendentes', value: String(pending.length) },
          { icon: ShieldAlert, label: 'Denúncias abertas', value: String(denunciations.filter((d) => d.status === 'pending').length) },
          { icon: Activity, label: 'Ações hoje', value: '12' },
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
          <TabsTrigger value="denunciations">Denúncias</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc">
          <div className="space-y-4">
            {pending.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhum KYC pendente. 🎉
                </CardContent>
              </Card>
            )}
            {kycQueue.map((item) => (
              <Card key={item.lawyerId} className={item.status !== 'pending' ? 'opacity-60' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        OAB/{item.oabState} {item.oabNumber} · Enviado em {formatDate(item.submittedAt)}
                      </p>
                    </div>
                    <Badge
                      variant={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'destructive' : 'warning'}
                    >
                      {item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </Badge>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver docs
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => approveKyc(item.lawyerId)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => setRejectTarget(item.lawyerId)}
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
                        {d.reporter} denunciou {d.reported}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline">Advertir</Button>
                      <Button size="sm" variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Banir
                      </Button>
                      <Button size="sm" variant="ghost">Dispensar</Button>
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
              <div className="space-y-3">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        Por {entry.user} · Alvo: {entry.target}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
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
              disabled={!rejectNote.trim()}
              onClick={() => rejectTarget && rejectKyc(rejectTarget)}
            >
              Confirmar rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
