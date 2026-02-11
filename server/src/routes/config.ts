import { Router, Request, Response } from 'express'
import { getUserByToken, getConfigByUserId, upsertConfig } from '../db/index.js'

const router = Router()

// GET /api/config/:token - Public endpoint for loader.js
router.get('/:token', (req: Request, res: Response) => {
  const { token } = req.params

  const user = getUserByToken(token)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const config = getConfigByUserId(user.id)
  if (!config) {
    res.status(404).json({ error: 'Config not found' })
    return
  }

  try {
    const configData = JSON.parse(config.config_json)

    // Ensure the API response always includes the rendererUrl used by the loader
    configData.rendererUrl = 'https://avantgardetricycle.github.io/renderer.js'

    res.json(configData)
  } catch {
    res.status(500).json({ error: 'Invalid config data' })
  }
})

// POST /api/config - Save/update user config
router.post('/', (req: Request, res: Response) => {
  const { token, config } = req.body

  if (!token || !config) {
    res.status(400).json({ error: 'Token and config are required' })
    return
  }

  const user = getUserByToken(token)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  try {
    const configJson = JSON.stringify(config)
    upsertConfig(user.id, configJson)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
