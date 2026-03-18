import { useState } from 'react'
import { Users, BarChart3, Calendar, Settings, Plus, Mail, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { mockLawyers } from '@/services/api/mock-data'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const COLORS = ['#1d4ed8', '#60a5fa', '#93c5fd', '#bfdbfe']

const monthlyData = [
  { month: 'Out', casos: 8, receita: 12000 },
  { month: 'Nov', casos: 12, receita: 18000 },
  { month: 'Dez', casos: 10, receita: 15000 },
  { month: 'Jan', casos: 15, receita: 22000 },
  { month: 'Fev', casos: 13, receita: 19500 },
  { month: 'Mar', casos: 18, receita: 27000 },
]

const specialtyData = [
  { name: 'Trabalhista', value: 35 },
  { name: 'Civil', value: 25 },
  { name: 'Tributário', value: 20 },
  { name: 'Família', value: 20 },
]

export default function OfficePage() {
  const { user } = useAuthStore()
  const [members] = useState(mockLawyers.filter((l) => l.status === 'verified'))
  const [inviteOpen, setInviteOpen] = useState(false)

  const stats = [
    { icon: Users, label: 'Membros ativos', value: String(members.length) },
    { icon: BarChart3, label: 'Casos este mês', value: '18' },
    { icon: UserCheck, label: 'Taxa de sucesso', value: '94%' },
    { icon: Calendar, label: 'Receita do mês', value: formatCurrency(27000) },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Painel do Escritório</h1>
          <p className="text-muted-foreground text-sm">Escritório Mendes & Associados</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Convidar membro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Convidar advogado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>E-mail do advogado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" type="email" placeholder="advogado@email.com" />
                  </div>
                </div>
                <Button className="w-full" onClick={() => setInviteOpen(false)}>Enviar convite</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
              <p className="text-sm font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="team">
        <TabsList className="mb-6">
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & BI</TabsTrigger>
          <TabsTrigger value="calendar">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((lawyer) => (
              <Card key={lawyer.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(lawyer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{lawyer.name}</p>
                    <p className="text-xs text-muted-foreground">OAB/{lawyer.oabState} {lawyer.oabNumber}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lawyer.specialties.slice(0, 2).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <StatusBadge type="lawyer" status={lawyer.status} />
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-center gap-2 h-full text-muted-foreground">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Adicionar membro</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Casos e Receita (últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="casos" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Casos" />
                    <Bar yAxisId="right" dataKey="receita" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Especialidade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={specialtyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {specialtyData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Agenda da equipe</h3>
                <p className="text-sm">
                  Integração com Google Calendar e Outlook em breve.
                </p>
                <Button className="mt-4" variant="outline">
                  Solicitar acesso antecipado
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
