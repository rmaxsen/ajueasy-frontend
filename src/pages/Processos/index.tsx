import { useState } from 'react'
import { Search, Plus, Trash2, RefreshCw, Scale, ChevronDown, ChevronUp, Info, AlertCircle, BookOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { processosApi, ProcessoMonitorado, ProcessoResult, ProcessoDetalhe } from '@/services/api/processos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function formatCnjDisplay(n: string) {
  // Already formatted, just return
  return n
}

// ─── Components ───────────────────────────────────────────────────────────────

function MovimentoCard({ mov, explicado }: {
  mov: { dataHora: string; nome: string; complemento?: string }
  explicado?: { dataHora: string; nomeOriginal: string; explicacao: string }
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{formatDate(mov.dataHora)}</p>
          <p className="text-sm font-medium mt-0.5 truncate">{mov.nome}</p>
          {explicado && (
            <p className="text-sm text-green-700 mt-1">{explicado.explicacao}</p>
          )}
        </div>
        {explicado && (
          <button
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-1"
            title="Ver termo técnico original"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
      {open && explicado && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          <span className="font-medium">Termo oficial:</span> {mov.nome}
          {mov.complemento && ` — ${mov.complemento}`}
        </p>
      )}
    </div>
  )
}

function ProcessoDetails({ data, onClose }: { data: ProcessoResult | ProcessoDetalhe; onClose: () => void }) {
  const ex = data.explicacao
  const movimentosExplicados = ex?.movimentos ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Voltar
        </button>
        <Badge variant="outline">{data.tribunal}</Badge>
      </div>

      {/* AI Summary */}
      {ex && (
        <div className="space-y-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-2">
                <BookOpen size={18} className="text-green-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Resumo do seu processo</p>
                  <p className="text-sm text-green-800 mt-1">{ex.resumo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-2">
                  <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Situação atual</p>
                    <p className="text-sm text-blue-800 mt-1">{ex.situacaoAtual}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-2">
                  <ArrowRight size={16} className="text-orange-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide">Próximos passos</p>
                    <p className="text-sm text-orange-800 mt-1">{ex.proximosPasso}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!ex && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2">
              <AlertCircle size={16} className="text-yellow-700 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Explicação por IA não disponível no momento. Os movimentos originais estão listados abaixo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process metadata */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Processo:</span>
          <p className="font-mono text-xs mt-0.5">{formatCnjDisplay(data.numeroProcesso)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Classe:</span>
          <p className="mt-0.5">{data.classe?.nome ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Órgão julgador:</span>
          <p className="mt-0.5">{data.orgaoJulgador?.nome ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ajuizado em:</span>
          <p className="mt-0.5">{formatDate(data.dataAjuizamento)}</p>
        </div>
        {data.assuntos?.length > 0 && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Assuntos:</span>
            <p className="mt-0.5">{data.assuntos.map((a) => a.nome).join(', ')}</p>
          </div>
        )}
      </div>

      {/* Movements */}
      <div>
        <h3 className="font-semibold text-sm mb-3">
          Movimentos processuais{' '}
          <span className="font-normal text-muted-foreground">({data.movimentos.length} registros)</span>
        </h3>
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {data.movimentos.map((m, i) => (
            <MovimentoCard
              key={i}
              mov={m}
              explicado={movimentosExplicados.find((e) => e.nomeOriginal === m.nome)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProcessosPage() {
  const [monitored, setMonitored] = useState<ProcessoMonitorado[]>([])
  const [loadedList, setLoadedList] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  const [searchNumber, setSearchNumber] = useState('')
  const [searchResult, setSearchResult] = useState<ProcessoResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [detail, setDetail] = useState<ProcessoDetalhe | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [addAlias, setAddAlias] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Load monitored list on first visit
  const loadList = async () => {
    setLoadingList(true)
    try {
      const list = await processosApi.list()
      setMonitored(list)
    } catch {
      // silently fail
    } finally {
      setLoadingList(false)
      setLoadedList(true)
    }
  }

  if (!loadedList && !loadingList) loadList()

  const handleSearch = async () => {
    if (!searchNumber.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    setDetail(null)
    try {
      const result = await processosApi.buscar(searchNumber.trim())
      setSearchResult(result)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setSearchError(e?.response?.data?.error ?? 'Erro ao buscar processo. Verifique o número e tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!searchResult) return
    setAdding(true)
    setAddError('')
    try {
      const created = await processosApi.add({
        numeroProcesso: searchResult.numeroProcesso,
        alias: addAlias.trim() || undefined,
      })
      setMonitored((prev) => [created, ...prev])
      setSearchResult(null)
      setSearchNumber('')
      setAddAlias('')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setAddError(e?.response?.data?.error ?? 'Erro ao adicionar processo.')
    } finally {
      setAdding(false)
    }
  }

  const handleOpenDetail = async (item: ProcessoMonitorado) => {
    setDetail(null)
    setLoadingDetail(true)
    setSearchResult(null)
    try {
      const d = await processosApi.get(item.id)
      setDetail(d)
    } catch {
      // silently fail
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleRemove = async (id: string) => {
    await processosApi.remove(id).catch(() => {})
    setMonitored((prev) => prev.filter((p) => p.id !== id))
    if (detail?.monitored?.id === id) setDetail(null)
  }

  const alreadyMonitored = searchResult
    ? monitored.some((m) => m.numeroProcesso === searchResult.numeroProcesso)
    : false

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale size={24} />
          Andamento Processual
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seus processos em linguagem simples — sem precisar consultar o advogado para cada atualização.
        </p>
      </div>

      {/* Search area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Buscar processo por número CNJ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Use o número completo no formato <span className="font-mono">NNNNNNN-DD.AAAA.J.TT.OOOO</span>{' '}
            (ex: <span className="font-mono">0000001-68.2019.8.26.0100</span>)
          </p>
          <div className="flex gap-2">
            <Input
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="0000001-68.2019.8.26.0100"
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !searchNumber.trim()}>
              {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              <span className="ml-2 hidden sm:inline">Buscar</span>
            </Button>
          </div>

          {searchError && (
            <div className="flex gap-2 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {searchError}
            </div>
          )}

          {/* Search result preview */}
          {searchResult && !detail && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium">{searchResult.numeroProcesso}</p>
                  <p className="text-sm text-muted-foreground">{searchResult.tribunal} · {searchResult.classe?.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{searchResult.orgaoJulgador?.nome}</p>
                </div>
                <Badge variant="secondary">{searchResult.movimentos.length} movimentos</Badge>
              </div>

              {searchResult.explicacao && (
                <p className="text-sm text-green-800 bg-white border border-green-200 rounded p-2">
                  {searchResult.explicacao.resumo}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!alreadyMonitored ? (
                  <>
                    <Input
                      value={addAlias}
                      onChange={(e) => setAddAlias(e.target.value)}
                      placeholder="Apelido (opcional, ex: Ação de cobrança)"
                      className="text-sm flex-1 min-w-[200px]"
                    />
                    <Button size="sm" onClick={handleAdd} disabled={adding}>
                      <Plus size={14} className="mr-1" />
                      {adding ? 'Salvando…' : 'Monitorar processo'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">✓ Já está na sua lista de monitorados</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchResult(null)}
                >
                  Ver detalhes completos
                </Button>
              </div>

              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail view (when opened from search preview or monitored list) */}
      {(detail || loadingDetail) && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            {loadingDetail && (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <RefreshCw size={18} className="animate-spin" />
                <span>Consultando DataJud e gerando explicação por IA…</span>
              </div>
            )}
            {detail && (
              <ProcessoDetails data={detail} onClose={() => setDetail(null)} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitored list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Meus processos monitorados</h2>
          <Button variant="ghost" size="sm" onClick={loadList} disabled={loadingList}>
            <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
          </Button>
        </div>

        {loadingList && (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
        )}

        {!loadingList && monitored.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <Scale size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhum processo monitorado ainda. Use a busca acima para adicionar.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {monitored.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer hover:border-primary transition-colors ${detail?.monitored?.id === p.id ? 'border-primary' : ''}`}
              onClick={() => handleOpenDetail(p)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {p.alias || p.numeroProcesso}
                    </p>
                    {p.alias && (
                      <p className="font-mono text-xs text-muted-foreground truncate">{p.numeroProcesso}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.tribunalIndex.toUpperCase()}
                      {p.lastCheckedAt && ` · Atualizado em ${formatDate(p.lastCheckedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Ver andamento →</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(p.id) }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
