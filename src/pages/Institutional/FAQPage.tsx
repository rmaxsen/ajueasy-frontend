import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    category: 'Para Clientes',
    items: [
      { q: 'O Ajueasy é um escritório de advocacia?', a: 'Não. O Ajueasy é uma plataforma de intermediação que conecta clientes a advogados. Nós facilitamos o encontro e o processo de contratação, mas não prestamos serviços advocatícios diretamente.' },
      { q: 'Como encontro um advogado confiável?', a: 'Todos os advogados na plataforma passam por verificação de OAB e documentos (KYC). Além disso, as avaliações são verificadas — só clientes com contratos concluídos podem avaliar.' },
      { q: 'Quanto custa usar a plataforma para clientes?', a: 'Para clientes, o uso da plataforma é gratuito. Você só paga pelos serviços do advogado que contratar.' },
      { q: 'Como funciona o processo de contratação?', a: 'Você publica sua demanda, recebe propostas de advogados verificados, escolhe a melhor proposta e aceita. Um contrato é gerado automaticamente e o advogado pode iniciar o trabalho.' },
      { q: 'Posso confiar nas avaliações?', a: 'Sim! Todas as avaliações no Ajueasy são verificadas — apenas clientes com contratos concluídos na plataforma podem deixar avaliações. Isso garante autenticidade.' },
    ],
  },
  {
    category: 'Para Advogados',
    items: [
      { q: 'Como me cadastro como advogado?', a: 'Crie uma conta, escolha a opção "Sou Advogado", complete o perfil com seus dados da OAB e envie os documentos para verificação. O processo leva até 48h úteis.' },
      { q: 'Posso atuar antes da verificação?', a: 'Não. Por segurança, seu perfil só fica visível e você só pode enviar propostas após a aprovação da verificação KYC.' },
      { q: 'Quais são os planos disponíveis?', a: 'Temos plano Free (3 propostas/mês), Pro (ilimitado + analytics) e Escritório (equipe + BI avançado). Consulte a página de Planos para detalhes.' },
      { q: 'Como funciona o módulo de correspondentes?', a: 'Com o plano Pro ou superior, você pode criar pedidos de correspondência para outros estados e também oferecer correspondência para outros advogados.' },
    ],
  },
  {
    category: 'Segurança',
    items: [
      { q: 'Por que não posso compartilhar meu contato antes do aceite?', a: 'Para proteger ambas as partes, bloquear fraudes e garantir que os acordos sejam documentados na plataforma. Após o aceite do contrato, as partes podem se comunicar diretamente.' },
      { q: 'Como reportar uma denúncia?', a: 'Em qualquer perfil ou proposta, há um botão "Reportar". Nossa equipe de moderação analisa em até 24h úteis.' },
      { q: 'Meus dados estão seguros?', a: 'Sim. Utilizamos criptografia em trânsito (TLS) e em repouso. Seguimos a LGPD e nosso DPO está disponível para dúvidas sobre dados pessoais.' },
    ],
  },
]

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold mb-3">Perguntas Frequentes</h1>
        <p className="text-muted-foreground">
          Encontre respostas para as dúvidas mais comuns sobre a plataforma.
        </p>
      </div>

      <div className="space-y-8">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-lg font-semibold mb-3 text-primary">{section.category}</h2>
            <div className="space-y-2">
              {section.items.map((item) => {
                const key = `${section.category}:${item.q}`
                const isOpen = open === key
                return (
                  <div key={key} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setOpen(isOpen ? null : key)}
                    >
                      <span className="font-medium text-sm">{item.q}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground border-t pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
