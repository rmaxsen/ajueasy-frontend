import { Shield, CheckCircle, AlertTriangle, Lock, Star, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: ShieldCheck,
    title: 'Verificação de advogados (KYC)',
    desc: 'Todo advogado passa por verificação de número OAB, documentos de identidade e comprovante de endereço antes de ter o perfil ativado. Fazemos checagem junto ao CFOAB.',
  },
  {
    icon: Star,
    title: 'Avaliações 100% verificadas',
    desc: 'Somente clientes que concluíram contratos na plataforma podem avaliar. Isso elimina avaliações falsas e garante confiabilidade nos feedbacks.',
  },
  {
    icon: Lock,
    title: 'Bloqueio de contato prematuro',
    desc: 'Para proteger ambas as partes, troca de contato direto antes do aceite formal é monitorada e bloqueada. Isso previne desvio de negócios e fraudes.',
  },
  {
    icon: AlertTriangle,
    title: 'Sistema de denúncias',
    desc: 'Qualquer usuário pode reportar comportamentos suspeitos. Nossa equipe de moderação analisa e responde em até 24h úteis.',
  },
  {
    icon: CheckCircle,
    title: 'Contratos documentados',
    desc: 'Toda contratação gera um registro de proposta, aceite e contrato na plataforma. Isso oferece rastreabilidade e proteção para clientes e advogados.',
  },
  {
    icon: Shield,
    title: 'Conformidade LGPD',
    desc: 'Seus dados são tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Temos DPO designado e processos de resposta a titulares.',
  },
]

export default function TrustPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Confiança e Segurança</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          No Ajueasy, segurança não é opcional. Conheça as medidas que adotamos para proteger clientes e advogados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {features.map((f) => (
          <Card key={f.title}>
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

      <div className="bg-muted/50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Encontrou algo suspeito?</h2>
        <p className="text-muted-foreground mb-4">
          Use o botão "Reportar" em qualquer perfil ou proposta, ou entre em contato com nossa equipe.
        </p>
        <p className="text-sm text-primary font-medium">seguranca@ajueasy.com.br</p>
      </div>
    </div>
  )
}
