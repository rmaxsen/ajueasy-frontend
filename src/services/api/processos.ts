import api from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Movimento {
  dataHora: string
  nome: string
  complementosTabelados?: Array<{ nome: string; descricao?: string }>
  complemento?: string
}

export interface MovimentoExplicado {
  dataHora: string
  nomeOriginal: string
  explicacao: string
}

export interface ExplicacaoProcesso {
  resumo: string
  situacaoAtual: string
  proximosPasso: string
  movimentos: MovimentoExplicado[]
}

export interface ProcessoResult {
  numeroProcesso: string
  tribunal: string
  tribunalIndex: string
  classe: { codigo: number; nome: string }
  assuntos: Array<{ codigo: number; nome: string }>
  orgaoJulgador: { nome: string }
  dataAjuizamento?: string
  grau?: string
  movimentos: Movimento[]
  explicacao: ExplicacaoProcesso | null
}

export interface ProcessoMonitorado {
  id: string
  userId: string
  numeroProcesso: string
  tribunalIndex: string
  alias: string | null
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProcessoDetalhe extends ProcessoResult {
  monitored: ProcessoMonitorado
}

// ─── API ───────────────────────────────────────────────────────────────────────

export const processosApi = {
  /** List user's monitored processes */
  list: () =>
    api.get<ProcessoMonitorado[]>('/processos').then((r) => r.data),

  /** Ad-hoc search by CNJ number (does not save to watchlist) */
  buscar: (numero: string) =>
    api.get<ProcessoResult>('/processos/buscar', { params: { numero } }).then((r) => r.data),

  /** Add a process to the user's watchlist */
  add: (data: { numeroProcesso: string; alias?: string }) =>
    api.post<ProcessoMonitorado>('/processos', data).then((r) => r.data),

  /** Get full details + movements + AI explanation for a monitored process */
  get: (id: string) =>
    api.get<ProcessoDetalhe>(`/processos/${id}`).then((r) => r.data),

  /** Remove a process from watchlist */
  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/processos/${id}`).then((r) => r.data),
}
