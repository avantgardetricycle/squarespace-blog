import { Router, Request, Response } from 'express'
import {
  getSiteBySiteKey,
  getActiveSiteConfig,
  upsertSiteConfig
} from '../db/index.js'

const router = Router()

// GET /api/config/:siteKey - Public endpoint for loader.js
router.get('/:siteKey', (req: Request, res: Response) => {
  const siteKey = req.params.siteKey as string

  const site = getSiteBySiteKey(siteKey)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  if (site.status === 'disabled') {
    res.status(403).json({ error: 'Site is disabled' })
    return
  }

  const siteConfig = getActiveSiteConfig(site.id)
  if (!siteConfig) {
    res.status(404).json({ error: 'Config not found' })
    return
  }

  try {
    const configData = JSON.parse(siteConfig.config_json)

    // Ensure the API response always includes the rendererUrl used by the loader
    configData.rendererUrl = configData.rendererUrl ?? 'https://avantgardetricycle.github.io/squarespace-blog/renderer.js'

    // Merge defaults for newer config fields (for configs saved before these were added)
    configData.showRecentPostsSidebar = configData.showRecentPostsSidebar ?? false
    configData.recentPostsCount = configData.recentPostsCount ?? 5
    configData.sidebarPosition = configData.sidebarPosition ?? 'left'
    configData.tableOfContentsPosition = configData.tableOfContentsPosition ?? 'left'

    res.json(configData)
  } catch {
    res.status(500).json({ error: 'Invalid config data' })
  }
})

// POST /api/config - Save/update site config
router.post('/', (req: Request, res: Response) => {
  const { siteKey, config } = req.body

  if (!siteKey || !config) {
    res.status(400).json({ error: 'siteKey and config are required' })
    return
  }

  const site = getSiteBySiteKey(siteKey)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  try {
    const configJson = JSON.stringify(config)
    upsertSiteConfig(site.id, configJson)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save config:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router
