
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { Pool } from 'pg'
import authRouter from './routes/auth.js'
import storesRouter from './routes/stores.js'
import productsRouter from './routes/products.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000
const isProduction = process.env.NODE_ENV === 'production'
const sessionSecret = process.env.SESSION_SECRET
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be configured with a strong secret.')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured.')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const PgSession = connectPgSimple(session)

app.disable('x-powered-by')

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
)

app.use(express.json({ limit: '100kb' }))

app.use(
  session({
    name: 'pos.sid',
    store: new PgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    },
  }),
)

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Multi-Store POS API is running',
    environment: process.env.NODE_ENV || 'development',
  })
})

app.use('/api/auth', authRouter)
app.use('/api/stores', storesRouter)
app.use('/api/stores', productsRouter)

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('API request failed:', error)

    res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred.',
    })
  },
)

const server = app.listen(PORT, () => {
  console.log(`POS API running at http://localhost:${PORT}`)
})

async function shutdown() {
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

