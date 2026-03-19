/**
 * Mailer — sends transactional emails.
 * In development: logs to console instead of sending real emails.
 * In production: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */

interface MailOptions {
  to: string
  subject: string
  html: string
}

async function sendMail(opts: MailOptions): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📧 [MAILER DEV] ─────────────────────────────')
    console.log('To:', opts.to)
    console.log('Subject:', opts.subject)
    console.log('Body:', opts.html.replace(/<[^>]+>/g, ' ').trim().slice(0, 200))
    console.log('────────────────────────────────────────────\n')
    return
  }

  // Production: use nodemailer (add as dependency when needed)
  // const nodemailer = require('nodemailer')
  // const transporter = nodemailer.createTransport({ ... })
  // await transporter.sendMail({ from: process.env.MAIL_FROM, ...opts })
}

export const mailer = {
  passwordReset: (to: string, resetUrl: string) =>
    sendMail({
      to,
      subject: 'Redefinição de senha — Ajueasy',
      html: `
        <h2>Redefinição de senha</h2>
        <p>Recebemos uma solicitação de redefinição de senha para a sua conta.</p>
        <p>Clique no link abaixo (válido por 1 hora):</p>
        <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Redefinir senha
        </a>
        <p>Se não foi você, ignore este e-mail.</p>
      `,
    }),

  kycApproved: (to: string, lawyerName: string) =>
    sendMail({
      to,
      subject: 'Seu perfil foi verificado — Ajueasy ✅',
      html: `
        <h2>Parabéns, ${lawyerName}!</h2>
        <p>Seu perfil foi <strong>verificado com sucesso</strong>. A partir de agora você está visível na busca e pode enviar propostas.</p>
        <a href="${process.env.APP_URL}/dashboard">Acessar o Dashboard</a>
      `,
    }),

  kycRejected: (to: string, lawyerName: string, note: string) =>
    sendMail({
      to,
      subject: 'Atualização sobre seu cadastro — Ajueasy',
      html: `
        <h2>Olá, ${lawyerName}</h2>
        <p>Infelizmente seu perfil não foi aprovado neste momento.</p>
        <p><strong>Motivo:</strong> ${note}</p>
        <p>Você pode reenviar seus documentos a qualquer momento pelo seu painel.</p>
      `,
    }),

  proposalReceived: (to: string, demandTitle: string, dashboardUrl: string) =>
    sendMail({
      to,
      subject: `Nova proposta recebida — ${demandTitle}`,
      html: `
        <h2>Você recebeu uma nova proposta!</h2>
        <p>Um advogado enviou uma proposta para sua demanda <strong>${demandTitle}</strong>.</p>
        <a href="${dashboardUrl}">Ver proposta</a>
      `,
    }),

  contractCreated: (to: string, price: number) =>
    sendMail({
      to,
      subject: 'Contrato gerado — Ajueasy',
      html: `
        <h2>Contrato gerado</h2>
        <p>Sua proposta foi aceita e um contrato no valor de <strong>R$ ${price.toFixed(2)}</strong> foi criado.</p>
        <p>Acesse sua área para ver os detalhes.</p>
      `,
    }),
}
