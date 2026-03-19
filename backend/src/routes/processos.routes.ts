/**
 * Processos — andamento processual via DataJud (CNJ)
 *
 * Endpoints:
 *  GET  /processos           — lista processos monitorados pelo usuário
 *  POST /processos           — adiciona um processo para monitorar
 *  GET  /processos/buscar    — busca ad-hoc por número CNJ (não salva)
 *  GET  /processos/:id       — detalhes + movimentos explicados por IA
 *  DELETE /processos/:id     — remove da lista de monitorados
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth.middleware'
import { validateBody, validateQuery } from '../middleware/validate.middleware'
import { buscarProcesso, parseCnj, resolveTribunalIndex } from '../lib/datajud'
import { explicarProcesso } from '../lib/ai-explainer'

const router = Router()

// ─── GET /processos — list monitored cases ─────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  const processos = await prisma.processoMonitorado.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  })
  return res.json(processos)
})

// ─── GET /processos/buscar?numero=XXXX — ad-hoc search ────────────────────────

const buscarQuery = z.object({
  numero: z.string().min(15, 'Informe o número completo do processo'),
})

router.get('/buscar', authenticate, validateQuery(buscarQuery), async (req: Request, res: Response) => {
  const { numero } = req.query as { numero: string }

  const result = await buscarProcesso(numero).catch((err: Error) => {
    return res.status(400).json({ error: err.message }) as unknown as null
  })

  if (result === null) return res.status(404).json({ error: 'Processo não encontrado no DataJud. Verifique o número e tente novamente.' })
  if (typeof result !== 'object' || !('processo' in result)) return // already responded

  const { processo, tribunalIndex } = result

  const explicacao = await explicarProcesso(processo).catch(() => null)

  return res.json({
    numeroProcesso: processo.numeroProcesso,
    tribunal: processo.tribunal,
    tribunalIndex,
    classe: processo.classe,
    assuntos: processo.assuntos ?? [],
    orgaoJulgador: processo.orgaoJulgador,
    dataAjuizamento: processo.dataAjuizamento,
    grau: processo.grau,
    movimentos: processo.movimentos,
    explicacao,
  })
})

// ─── POST /processos — add process to watchlist ────────────────────────────────

const addSchema = z.object({
  numeroProcesso: z.string().min(15, 'Informe o número completo do processo'),
  alias: z.string().max(80).optional(),
})

router.post('/', authenticate, validateBody(addSchema), async (req: Request, res: Response) => {
  const { numeroProcesso, alias } = req.body as z.infer<typeof addSchema>

  const parts = parseCnj(numeroProcesso)
  if (!parts) return res.status(400).json({ error: 'Número de processo inválido. Use o formato CNJ.' })

  const tribunalIndex = resolveTribunalIndex(parts)
  if (!tribunalIndex) {
    return res.status(400).json({
      error: `Tribunal não identificado para segmento ${parts.segment} / código ${parts.tribunal}. Verifique o número do processo.`,
    })
  }

  // Verify the process actually exists before saving
  const result = await buscarProcesso(parts.formatted, tribunalIndex).catch((err: Error) => {
    return res.status(400).json({ error: err.message }) as unknown as null
  })
  if (!result) return res.status(404).json({ error: 'Processo não encontrado no DataJud.' })
  if (!('processo' in result)) return // already responded

  const created = await prisma.processoMonitorado.upsert({
    where: {
      userId_numeroProcesso: {
        userId: req.user!.id,
        numeroProcesso: parts.formatted,
      },
    },
    create: {
      userId: req.user!.id,
      numeroProcesso: parts.formatted,
      tribunalIndex,
      alias: alias ?? null,
      lastCheckedAt: new Date(),
    },
    update: {
      alias: alias ?? undefined,
      lastCheckedAt: new Date(),
    },
  })

  return res.status(201).json(created)
})

// ─── GET /processos/:id — get details + AI explanation ────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const monitored = await prisma.processoMonitorado.findUnique({
    where: { id: req.params.id },
  })
  if (!monitored) return res.status(404).json({ error: 'Processo não encontrado' })
  if (monitored.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sem permissão' })
  }

  const result = await buscarProcesso(monitored.numeroProcesso, monitored.tribunalIndex).catch(
    (err: Error) => res.status(502).json({ error: `DataJud indisponível: ${err.message}` }) as unknown as null
  )
  if (!result) return res.status(404).json({ error: 'Processo não encontrado no DataJud' })
  if (!('processo' in result)) return

  const { processo } = result

  // Update last checked timestamp
  await prisma.processoMonitorado.update({
    where: { id: monitored.id },
    data: { lastCheckedAt: new Date() },
  }).catch(() => {}) // non-blocking

  const explicacao = await explicarProcesso(processo).catch(() => null)

  return res.json({
    monitored,
    numeroProcesso: processo.numeroProcesso,
    tribunal: processo.tribunal,
    tribunalIndex: monitored.tribunalIndex,
    classe: processo.classe,
    assuntos: processo.assuntos ?? [],
    orgaoJulgador: processo.orgaoJulgador,
    dataAjuizamento: processo.dataAjuizamento,
    grau: processo.grau,
    movimentos: processo.movimentos,
    explicacao,
  })
})

// ─── DELETE /processos/:id — remove from watchlist ────────────────────────────

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const monitored = await prisma.processoMonitorado.findUnique({
    where: { id: req.params.id },
  })
  if (!monitored) return res.status(404).json({ error: 'Processo não encontrado' })
  if (monitored.userId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão' })

  await prisma.processoMonitorado.delete({ where: { id: req.params.id } })
  return res.json({ ok: true })
})

export default router
