/**
 * AI Explainer — usa Claude (claude-haiku-4-5) para traduzir
 * movimentos processuais em linguagem simples para leigos.
 *
 * Requer ANTHROPIC_API_KEY no ambiente.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Movimento, ProcessoDataJud } from './datajud'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MovimentoExplicado {
  dataHora: string
  nomeOriginal: string
  explicacao: string   // Plain Portuguese explanation
}

export interface ExplicacaoProcesso {
  resumo: string                     // 1-2 sentence overall summary
  situacaoAtual: string              // Current status in plain language
  proximosPasso: string              // What to expect next
  movimentos: MovimentoExplicado[]   // Each movement explained
}

// ─── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(processo: ProcessoDataJud): string {
  const movimentos = processo.movimentos
    .slice(0, 30) // Max 30 most recent
    .map((m, i) => {
      const complemento = [
        ...(m.complementosTabelados?.map((c) => c.nome) ?? []),
        m.complemento ?? '',
      ]
        .filter(Boolean)
        .join(', ')
      return `${i + 1}. [${m.dataHora.slice(0, 10)}] ${m.nome}${complemento ? ` (${complemento})` : ''}`
    })
    .join('\n')

  return `Você é um assistente jurídico que explica processos judiciais para pessoas sem formação em direito.

Dados do processo:
- Número: ${processo.numeroProcesso}
- Tribunal: ${processo.tribunal}
- Classe: ${processo.classe?.nome ?? '—'}
- Assunto(s): ${processo.assuntos?.map((a) => a.nome).join(', ') ?? '—'}
- Órgão julgador: ${processo.orgaoJulgador?.nome ?? '—'}
- Data de ajuizamento: ${processo.dataAjuizamento?.slice(0, 10) ?? '—'}

Movimentos (do mais recente ao mais antigo):
${movimentos}

Responda APENAS com um JSON válido no formato abaixo (sem markdown, sem código, apenas JSON puro):
{
  "resumo": "Uma ou duas frases resumindo sobre o que trata o processo e seu estado geral.",
  "situacaoAtual": "Descrição clara da situação atual do processo em linguagem simples.",
  "proximosPasso": "O que o cliente pode esperar que aconteça a seguir, de forma realista.",
  "movimentos": [
    {
      "dataHora": "data do movimento original",
      "nomeOriginal": "nome técnico do movimento",
      "explicacao": "Explicação em até 2 frases em linguagem simples para leigos."
    }
  ]
}

Regras:
- Linguagem simples, sem jargão jurídico. Explique como se fosse para alguém sem estudos de direito.
- Seja objetivo e honesto. Não prometa resultados.
- Os movimentos no JSON devem seguir a mesma ordem dos dados fornecidos.
- Retorne no máximo os primeiros 15 movimentos explicados.`
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Explain a court case in plain Portuguese using Claude.
 * Returns null if ANTHROPIC_API_KEY is not set (graceful degradation).
 */
export async function explicarProcesso(
  processo: ProcessoDataJud
): Promise<ExplicacaoProcesso | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(processo) }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    return JSON.parse(text) as ExplicacaoProcesso
  } catch {
    // Claude returned malformed JSON — return degraded version
    return {
      resumo: `Processo ${processo.numeroProcesso} no ${processo.tribunal}.`,
      situacaoAtual: 'Não foi possível gerar a explicação automática no momento.',
      proximosPasso: 'Consulte seu advogado para atualização detalhada.',
      movimentos: processo.movimentos.slice(0, 15).map((m) => ({
        dataHora: m.dataHora,
        nomeOriginal: m.nome,
        explicacao: m.nome,
      })),
    }
  }
}
