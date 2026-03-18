import { Link } from 'react-router-dom'
import { Search, Shield, Star, Scale, ArrowRight, CheckCircle, Users, FileText, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LawyerCard } from '@/components/shared/LawyerCard'
import { mockLawyers, mockPlans } from '@/services/api/mock-data'
import { formatCurrency } from '@/lib/utils'

const features = [
  {
    icon: Search,
    title: 'Busca inteligente',
    desc: 'Encontre advogados por especialidade, localização e avaliações verificadas.',
  },
  {
    icon: Shield,
    title: 'Advogados verificados',
    desc: 'Todos os advogados passam por verificação de OAB e documentos antes de atuar.',
  },
  {
    icon: Star,
    title: 'Avaliações autênticas',
    desc: 'Avaliações apenas de clientes com contratos concluídos na plataforma.',
  },
  {
    icon: FileText,
    title: 'Contratos seguros',
    desc: 'Propostas, aceites e contratos documentados e armazenados com segurança.',
  },
  {
    icon: Zap,
    title: 'Marketplace de demandas',
    desc: 'Publique sua necessidade e receba propostas de advogados qualificados.',
  },
  {
    icon: Users,
    title: 'Correspondentes jurídicos',
    desc: 'Advogados encontram correspondentes em qualquer estado com agilidade.',
  },
]

const steps = [
  { n: '1', title: 'Descreva sua demanda', desc: 'Conte o que você precisa em poucos minutos.' },
  { n: '2', title: 'Receba propostas', desc: 'Advogados verificados enviam propostas personalizadas.' },
  { n: '3', title: 'Escolha e contrate', desc: 'Aceite a proposta e gere o contrato com segurança.' },
  { n: '4', title: 'Avalie o serviço', desc: 'Após a conclusão, deixe uma avaliação verificada.' },
]

export default function LandingPage() {
  const verifiedLawyers = mockLawyers.filter((l) => l.status === 'verified').slice(0, 3)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="info" className="mb-4 text-sm px-4 py-1">
            Plataforma jurídica #1 do Brasil
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Assessoria jurídica{' '}
            <span className="text-primary">fácil</span> e{' '}
            <span className="text-primary">segura</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Conectamos clientes a advogados verificados com transparência, segurança e agilidade.
            Do primeiro contato ao contrato assinado, tudo na mesma plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/buscar">
                <Search className="mr-2 h-5 w-5" />
                Buscar Advogado
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/marketplace">
                Publicar Demanda
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 md:grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { n: '5.000+', l: 'Advogados' },
              { n: '98%', l: 'Satisfação' },
              { n: '12.000+', l: 'Casos' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-bold text-primary">{s.n}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Por que escolher o Ajueasy?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Uma plataforma completa que cuida de cada etapa da sua relação jurídica.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Como funciona</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={s.n} className="text-center relative">
                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-5 -right-3 h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Lawyers */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Advogados em destaque</h2>
          <Button variant="outline" asChild>
            <Link to="/buscar">Ver todos</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {verifiedLawyers.map((l) => (
            <LawyerCard key={l.id} lawyer={l} />
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Planos para advogados</h2>
            <p className="text-muted-foreground">Comece grátis e expanda quando precisar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {mockPlans.map((plan) => (
              <Card key={plan.id} className={plan.slug === 'pro' ? 'border-primary shadow-lg relative' : ''}>
                {plan.slug === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-4">Mais popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    {plan.priceMonthly === 0 ? (
                      <span className="text-3xl font-bold">Grátis</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly)}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.slug === 'pro' ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to={`/cadastro?role=lawyer&plan=${plan.slug}`}>
                      {plan.priceMonthly === 0 ? 'Começar grátis' : 'Assinar agora'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <Scale className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Cadastre-se gratuitamente e encontre o suporte jurídico que você precisa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/cadastro">Criar conta grátis</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link to="/como-funciona">Saber mais</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
