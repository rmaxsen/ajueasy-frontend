/**
 * DataJud — CNJ Public API client
 *
 * Docs: https://datajud-wiki.cnj.jus.br/api-publica/
 *
 * The API key below is the public shared key provided by CNJ.
 * You can request a dedicated higher-rate-limit key at:
 *   https://datajud-wiki.cnj.jus.br/api-publica/acesso/
 *
 * Set DATAJUD_API_KEY in your env to override the default public key.
 */

import https from 'node:https'

const DATAJUD_KEY = process.env.DATAJUD_API_KEY ?? 'cDZHYzlZa0JadVREZDJCendFbXNpTT'
const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br'

// ─── Tribunal index mapping ────────────────────────────────────────────────────

// Segment 8 (State courts — TJxx)
// TR ordered alphabetically by UF abbreviation: AC=01, AL=02, AM=03 … SP=26, TO=27
const TJXX: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap',
  '05': 'tjba', '06': 'tjce', '07': 'tjdft', '08': 'tjes',
  '09': 'tjgo', '10': 'tjma', '11': 'tjmg', '12': 'tjms',
  '13': 'tjmt', '14': 'tjpa', '15': 'tjpb', '16': 'tjpe',
  '17': 'tjpi', '18': 'tjpr', '19': 'tjrj', '20': 'tjrn',
  '21': 'tjro', '22': 'tjrr', '23': 'tjrs', '24': 'tjsc',
  '25': 'tjse', '26': 'tjsp', '27': 'tjto',
}

// Segment 4 (Federal courts — TRFx)
const TRFX: Record<string, string> = {
  '01': 'trf1', '02': 'trf2', '03': 'trf3', '04': 'trf4',
  '05': 'trf5', '06': 'trf6',
}

// Segment 5 (Labor courts — TRTx)
const TRTX: Record<string, string> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => [String(i + 1).padStart(2, '0'), `trt${i + 1}`])
)

// Segment 6 (Electoral courts — TREx) — same TR codes as segment 8
const TREX: Record<string, string> = Object.fromEntries(
  Object.entries(TJXX).map(([k]) => [k, `tre${TJXX[k]?.slice(2) ?? k}`])
)

// ─── CNJ number parsing ────────────────────────────────────────────────────────

export interface CnjParts {
  raw: string          // 20-digit unformatted number
  formatted: string    // NNNNNNN-DD.AAAA.J.TT.OOOO
  segment: string      // J (1 char)
  tribunal: string     // TT (2 chars)
  year: string         // AAAA
}

/** Remove any non-digit characters from a CNJ number */
function digits(s: string) { return s.replace(/\D/g, '') }

/** Format a raw 20-digit CNJ number */
function format(raw: string) {
  if (raw.length !== 20) return raw
  return `${raw.slice(0, 7)}-${raw.slice(7, 9)}.${raw.slice(9, 13)}.${raw.slice(13, 14)}.${raw.slice(14, 16)}.${raw.slice(16, 20)}`
}

export function parseCnj(input: string): CnjParts | null {
  const raw = digits(input)
  if (raw.length !== 20) return null
  return {
    raw,
    formatted: format(raw),
    segment: raw[13],
    tribunal: raw.slice(14, 16),
    year: raw.slice(9, 13),
  }
}

/** Resolve the DataJud index name for a given CNJ number */
export function resolveTribunalIndex(parts: CnjParts): string | null {
  const { segment, tribunal } = parts
  switch (segment) {
    case '1': return 'stf'
    case '2': return 'cnj'
    case '3': return 'stj'
    case '4': return TRFX[tribunal] ?? null
    case '5': return TRTX[tribunal] ?? null
    case '6': return TREX[tribunal] ?? null
    case '8': return TJXX[tribunal] ?? null
    default: return null
  }
}

// ─── HTTP helper ───────────────────────────────────────────────────────────────

function datajudPost<T>(path: string, body: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const url = new URL(`${DATAJUD_BASE}${path}`)
    const options: https.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        Authorization: `APIKey ${DATAJUD_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data) as T) }
        catch { reject(new Error('DataJud: resposta inválida')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error('DataJud: timeout')) })
    req.write(payload)
    req.end()
  })
}

// ─── DataJud response types ────────────────────────────────────────────────────

export interface Movimento {
  dataHora: string
  nome: string
  complementosTabelados?: Array<{ nome: string; descricao?: string }>
  complemento?: string
}

export interface ProcessoDataJud {
  id: string
  numeroProcesso: string
  tribunal: string
  classe: { codigo: number; nome: string }
  assuntos?: Array<{ codigo: number; nome: string }>
  orgaoJulgador: { nome: string; codigoMunicipioIBGE?: number }
  dataAjuizamento?: string
  grau?: string
  movimentos: Movimento[]
}

interface DataJudHit {
  _source: ProcessoDataJud
}

interface DataJudResponse {
  hits?: {
    total?: { value: number }
    hits?: DataJudHit[]
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Search a process by CNJ number on the appropriate tribunal index.
 * Returns null when process is not found.
 */
export async function buscarProcesso(
  numeroProcesso: string,
  tribunalIndexOverride?: string
): Promise<{ processo: ProcessoDataJud; tribunalIndex: string } | null> {
  const parts = parseCnj(numeroProcesso)
  if (!parts) throw new Error('Número de processo inválido. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO')

  const tribunalIndex = tribunalIndexOverride ?? resolveTribunalIndex(parts)
  if (!tribunalIndex) throw new Error(`Tribunal não reconhecido para o segmento ${parts.segment} / código ${parts.tribunal}`)

  const result = await datajudPost<DataJudResponse>(`/api_publica_${tribunalIndex}/_search`, {
    query: { match: { numeroProcesso: parts.raw } },
    sort: [{ 'movimentos.dataHora': { order: 'desc' } }],
    size: 1,
  })

  const hits = result?.hits?.hits ?? []
  if (hits.length === 0) return null

  return { processo: hits[0]._source, tribunalIndex }
}
