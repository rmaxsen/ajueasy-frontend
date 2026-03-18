import { Link } from 'react-router-dom'
import { FileText, Users, Star, TrendingUp, Scale, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockContracts, mockDemands } from '@/services/api/mock-data'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const chartData = [
  { month: 'Out', propostas: 4, contratos: 2 },
  { month: 'Nov', propostas: 6, contratos: 3 },
  { month: 'Dez', propostas: 5, contratos: 4 },
  { month: 'Jan', propostas: 9, contratos: 6 },
  { month: 'Fev', propostas: 7, contratos: 5 },
  { month: 'Mar', propostas: 11, contratos: 8 },
]

const revenueData = [
  { month: 'Out', receita: 1200 },
  { month: 'Nov', receita: 1800 },
  { month: 'Dez', receita: 2200 },
  { month: 'Jan', receita: 2800 },
  { month: 'Fev', receita: 2400 },
  { month: 'Mar', receita: 3600 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isLawyer = user?.role === 'lawyer'
  const isUnverified = isLawyer && (user as any)?.status !== 'verified'

  const stats = isLawyer
    ? [
        { icon: FileText, label: 'Propostas enviadas', value: '23', trend: '+4 este mês' },
        { icon: Scale, label: 'Contratos ativos', value: '5', trend: '2 novos' },
        { icon: Star, label: 'Avaliação média', value: '4.8', trend: '47 avaliações' },
        { icon: TrendingUp, label: 'Receita (mês)', value: formatCurrency(3600), trend: '+15%' },
      ]
    : [
        { icon: FileText, label: 'Demandas publicadas', value: String(mockDemands.length), trend: '1 nova' },
        { icon: Users, label: 'Propostas recebidas', value: '8', trend: '3 novas' },
        { icon: Scale, label: 'Contratos ativos', value: '1', trend: '' },
        { icon: CheckCircle, label: 'Casos resolvidos', value: '3', trend: '100% satisfação' },
      ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLawyer ? 'Painel do Advogado' : 'Painel do Cliente'}
          </p>
        </div>
        {isLawyer && (
          <div className="flex items-center gap-2">
            <StatusBadge type="lawyer" status={(user as any)?.status ?? 'pending'} />
            {(user as any)?.plan === 'pro' && <Badge variant="info">PRO</Badge>}
          </div>
        )}
      </div>

      {/* Unverified warning */}
      {isUnverified && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Verificação pendente</p>
            <p className="text-sm text-amber-700 mb-2">
              Seu perfil está em análise. Após aprovação, você será visível na busca e poderá enviar propostas.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/onboarding">Ver status do envio</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
              <p className="text-sm font-medium">{s.label}</p>
              {s.trend && <p className="text-xs text-muted-foreground mt-0.5">{s.trend}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts (only for lawyers with pro plan) */}
      {isLawyer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Propostas vs Contratos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="propostas" stroke="#60a5fa" fill="#bfdbfe" name="Propostas" />
                  <Area type="monotone" dataKey="contratos" stroke="#1d4ed8" fill="#93c5fd" name="Contratos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita mensal (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="receita" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile completion (only for lawyers) */}
      {isLawyer && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">Completude do perfil</p>
              <span className="text-sm font-semibold text-primary">75%</span>
            </div>
            <Progress value={75} className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Foto', done: true },
                { label: 'Bio', done: true },
                { label: 'OAB verificada', done: false },
                { label: 'Especialidades', done: true },
                { label: 'Documentos', done: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    item.done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.done ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLawyer ? (
          <>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/marketplace">
                <FileText className="h-5 w-5" />
                <span>Ver demandas</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/correspondentes">
                <Users className="h-5 w-5" />
                <span>Correspondentes</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/feed">
                <Star className="h-5 w-5" />
                <span>Publicar artigo</span>
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/marketplace">
                <FileText className="h-5 w-5" />
                <span>Publicar demanda</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/buscar">
                <Users className="h-5 w-5" />
                <span>Buscar advogado</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-1">
              <Link to="/contratos">
                <Scale className="h-5 w-5" />
                <span>Meus contratos</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
