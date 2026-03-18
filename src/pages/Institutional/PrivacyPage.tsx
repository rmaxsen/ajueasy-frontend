export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
      <p className="text-muted-foreground text-sm mb-8">Última atualização: 1º de março de 2024</p>

      <div className="space-y-6 text-foreground">
        {[
          { title: '1. Dados coletados', body: 'Coletamos nome, e-mail, CPF/CNPJ (para advogados), número OAB, documentos enviados para verificação KYC, dados de uso da plataforma (navegação, cliques) e dados de pagamento (processados pelo gateway, não armazenados por nós).' },
          { title: '2. Finalidade do tratamento', body: 'Os dados são utilizados para: criar e gerenciar sua conta; verificar a habilitação de advogados na OAB; processar pagamentos; enviar notificações transacionais; melhorar a plataforma; e cumprir obrigações legais.' },
          { title: '3. Compartilhamento', body: 'Não vendemos seus dados. Compartilhamos apenas com: parceiros de pagamento; serviços de armazenamento em nuvem; autoridades públicas quando exigido por lei; e entre clientes e advogados após aceite de contrato (limitado ao necessário para o serviço).' },
          { title: '4. Seus direitos (LGPD)', body: 'Você tem direito a: acessar, corrigir, exportar e solicitar a exclusão de seus dados; revogar consentimento; e reclamar junto à ANPD. Envie solicitações para privacy@ajueasy.com.br.' },
          { title: '5. Cookies', body: 'Usamos cookies essenciais (sessão, autenticação) e analíticos (comportamento de uso, anonimizados). Você pode gerenciar preferências nas configurações do navegador.' },
          { title: '6. Segurança', body: 'Adotamos criptografia TLS em trânsito, criptografia em repouso para dados sensíveis, controle de acesso baseado em funções (RBAC) e monitoramento contínuo de segurança.' },
          { title: '7. Retenção de dados', body: 'Dados de conta são mantidos enquanto a conta estiver ativa. Após exclusão, dados são anonimizados em até 90 dias, exceto quando a retenção for exigida por lei.' },
        ].map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
