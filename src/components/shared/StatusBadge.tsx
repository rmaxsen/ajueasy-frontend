import { Badge } from '@/components/ui/badge'
import { LawyerStatus, DemandStatus, ContractStatus, ProposalStatus } from '@/types'

const lawyerStatusMap: Record<LawyerStatus, { label: string; variant: any }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  under_review: { label: 'Em análise', variant: 'warning' },
  verified: { label: 'Verificado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
}

const demandStatusMap: Record<DemandStatus, { label: string; variant: any }> = {
  open: { label: 'Aberta', variant: 'info' },
  in_progress: { label: 'Em andamento', variant: 'warning' },
  closed: { label: 'Encerrada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

const contractStatusMap: Record<ContractStatus, { label: string; variant: any }> = {
  active: { label: 'Ativo', variant: 'info' },
  completed: { label: 'Concluído', variant: 'success' },
  disputed: { label: 'Em disputa', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
}

const proposalStatusMap: Record<ProposalStatus, { label: string; variant: any }> = {
  pending: { label: 'Aguardando', variant: 'warning' },
  accepted: { label: 'Aceita', variant: 'success' },
  rejected: { label: 'Recusada', variant: 'destructive' },
  withdrawn: { label: 'Retirada', variant: 'secondary' },
}

interface StatusBadgeProps {
  type: 'lawyer' | 'demand' | 'contract' | 'proposal'
  status: string
  className?: string
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const maps = { lawyer: lawyerStatusMap, demand: demandStatusMap, contract: contractStatusMap, proposal: proposalStatusMap }
  const map = maps[type] as Record<string, { label: string; variant: any }>
  const info = map[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={info.variant} className={className}>{info.label}</Badge>
}
