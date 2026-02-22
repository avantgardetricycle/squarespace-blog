import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import configRoutes from './routes/config.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(
  cors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true
  })
)
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/config', configRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
