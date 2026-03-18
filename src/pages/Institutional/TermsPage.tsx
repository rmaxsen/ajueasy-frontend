export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
      <p className="text-muted-foreground text-sm mb-8">Última atualização: 1º de março de 2024</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        {[
          {
            title: '1. Sobre a plataforma',
            body: 'O Ajueasy é uma plataforma digital de intermediação que conecta pessoas físicas e jurídicas ("Clientes") a advogados devidamente inscritos na Ordem dos Advogados do Brasil ("Advogados"). Não somos um escritório de advocacia e não prestamos serviços jurídicos diretamente.',
          },
          {
            title: '2. Cadastro e elegibilidade',
            body: 'Para utilizar a plataforma, o usuário deve ter 18 anos ou mais e fornecer informações verdadeiras. Advogados devem estar regularmente inscritos na OAB e submeter documentação para verificação antes de atuar.',
          },
          {
            title: '3. Proibição de contato direto antes do aceite',
            body: 'É expressamente proibido compartilhar informações de contato direto (telefone, e-mail pessoal, WhatsApp, redes sociais) em propostas, mensagens ou perfis públicos antes do aceite formal de um contrato na plataforma. O descumprimento pode resultar em suspensão ou banimento.',
          },
          {
            title: '4. Avaliações verificadas',
            body: 'Apenas usuários com contratos concluídos na plataforma podem publicar avaliações sobre advogados. Avaliações falsas ou manipuladas são proibidas e podem resultar em remoção e ações legais.',
          },
          {
            title: '5. Responsabilidade',
            body: 'O Ajueasy não é responsável pela qualidade, legalidade ou resultados dos serviços prestados pelos advogados. Atuamos como intermediador e não somos parte nos contratos entre clientes e advogados.',
          },
          {
            title: '6. Modificações',
            body: 'Podemos alterar estes Termos a qualquer momento. Notificaremos os usuários com pelo menos 15 dias de antecedência para alterações materiais.',
          },
          {
            title: '7. Lei aplicável',
            body: 'Estes Termos são regidos pelas leis da República Federativa do Brasil. O foro da Comarca de São Paulo/SP é eleito para dirimir quaisquer controvérsias.',
          },
        ].map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
