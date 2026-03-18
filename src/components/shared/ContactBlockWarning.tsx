import { AlertTriangle } from 'lucide-react'

interface ContactBlockWarningProps {
  visible: boolean
}

export function ContactBlockWarning({ visible }: ContactBlockWarningProps) {
  if (!visible) return null
  return (
    <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-3 mt-2">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">
        <strong>Atenção:</strong> Detectamos informações de contato direto (telefone, e-mail ou redes sociais).
        A troca de contato fora da plataforma antes do aceite é proibida e pode resultar em suspensão da conta.
        Remova essas informações para continuar.
      </p>
    </div>
  )
}
