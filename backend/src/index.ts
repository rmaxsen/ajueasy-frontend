import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes'
import usersRoutes from './routes/users.routes'
import lawyersRoutes from './routes/lawyers.routes'
import feedRoutes from './routes/feed.routes'
import marketplaceRoutes from './routes/marketplace.routes'
import contractsRoutes from './routes/contracts.routes'
import reviewsRoutes from './routes/reviews.routes'
import correspondentsRoutes from './routes/correspondents.routes'
import adminRoutes from './routes/admin.routes'

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express()
const PORT = parseInt(process.env.PORT ?? '3333', 10)

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (mobile/Postman) or listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true)
      } else {
        cb(new Error(`CORS: Origin ${origin} not allowed`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// ─── Rate limiting ────────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente em alguns minutos.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticação. Aguarde 15 minutos.' },
})

app.use(globalLimiter)

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Static files (uploads) ───────────────────────────────────────────────────

const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
app.use('/uploads', express.static(path.resolve(uploadDir)))

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  })
})

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth', authLimiter, authRoutes)
app.use('/users', usersRoutes)
app.use('/lawyers', lawyersRoutes)
app.use('/feed', feedRoutes)
app.use('/demands', marketplaceRoutes)
app.use('/contracts', contractsRoutes)
// Reviews are nested under /contracts/:contractId — handled in contracts routes
// But frontend also calls POST /contracts/:id/review, so mount reviews separately
app.use('/contracts', reviewsRoutes)
app.use('/correspondents', correspondentsRoutes)
app.use('/admin', adminRoutes)

// ─── Error handler ────────────────────────────────────────────────────────────

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.message?.startsWith('CORS')) {
      return res.status(403).json({ error: err.message })
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `Arquivo muito grande. Máximo: ${process.env.MAX_FILE_SIZE_MB ?? 10}MB` })
    }

    console.error('[ERROR]', err)
    const status = err.status ?? err.statusCode ?? 500
    const message = process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message
    return res.status(status).json({ error: message })
  }
)

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Ajueasy API rodando em http://localhost:${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   CORS: ${allowedOrigins.join(', ')}\n`)
})

export default app
