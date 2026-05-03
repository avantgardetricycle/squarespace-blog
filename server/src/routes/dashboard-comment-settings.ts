import { Router, Request, Response } from 'express'
import prisma from '../db/index.js'
import { requireSession, SessionUser } from '../middleware/session.js'
import { encrypt } from '../lib/encryption.js'

const router = Router()

const DEFAULT_SETTINGS = {
  commentsEnabled: true,
  allowAnonymousComments: true,
  subscriberCommentsEnabled: false,
  requireApproval: false,
  autoCloseAfterDays: null as number | null,
  notifyEmail: true,
  notificationEmail: null as string | null,
  allowLikes: true,
  allowThreadedReplies: true,
  sortOrder: 'newest' as 'newest' | 'oldest' | 'most_liked',
}

/** Ensure site is owned by user */
async function getSiteForUser(siteKey: string, userId: number) {
  const site = await prisma.site.findFirst({
    where: { siteKey, userId, deletedAt: null },
    include: { blogCommentSettings: true },
  })
  return site
}

// GET /api/dashboard/settings/comments?siteKey=xxx
router.get('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const siteKey = typeof req.query.siteKey === 'string' ? req.query.siteKey.trim() : null

  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  const s = site.blogCommentSettings
  const legacyApiKey = (s as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null
  const effectiveApiKeyEnc = site.squarespaceApiKeyEnc ?? legacyApiKey
  const rawAutoClose = s?.autoCloseAfterDays ?? DEFAULT_SETTINGS.autoCloseAfterDays
  const settings = {
    commentsEnabled: s?.commentsEnabled ?? DEFAULT_SETTINGS.commentsEnabled,
    allowAnonymousComments: s?.allowAnonymousComments ?? DEFAULT_SETTINGS.allowAnonymousComments,
    subscriberCommentsEnabled: s?.subscriberCommentsEnabled ?? DEFAULT_SETTINGS.subscriberCommentsEnabled,
    apiKeyVerified: !!effectiveApiKeyEnc,
    requireApproval: s?.requireApproval ?? DEFAULT_SETTINGS.requireApproval,
    autoCloseAfterDays: rawAutoClose === 0 ? null : rawAutoClose,
    notifyEmail: s?.notifyEmail ?? DEFAULT_SETTINGS.notifyEmail,
    notificationEmail: s?.notificationEmail ?? DEFAULT_SETTINGS.notificationEmail,
    allowLikes: s?.allowLikes ?? DEFAULT_SETTINGS.allowLikes,
    allowThreadedReplies: s?.allowThreadedReplies ?? DEFAULT_SETTINGS.allowThreadedReplies,
    sortOrder: (s?.sortOrder ?? DEFAULT_SETTINGS.sortOrder) as 'newest' | 'oldest' | 'most_liked',
  }

  res.json(settings)
})

// PUT /api/dashboard/settings/comments
router.put('/', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as {
    siteKey?: string
    commentsEnabled?: boolean
    allowAnonymousComments?: boolean
    subscriberCommentsEnabled?: boolean
    squarespaceApiKey?: string
    requireApproval?: boolean
    autoCloseAfterDays?: number | null
    notifyEmail?: boolean
    notificationEmail?: string | null
    allowLikes?: boolean
    allowThreadedReplies?: boolean
    sortOrder?: 'newest' | 'oldest' | 'most_liked'
  }

  const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : null
  if (!siteKey) {
    res.status(400).json({ error: 'siteKey is required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }
  const legacyApiKey = (site.blogCommentSettings as unknown as { squarespaceApiKeyEnc?: string | null } | null)?.squarespaceApiKeyEnc ?? null

  const updates: Record<string, unknown> = {
    commentsEnabled: body.commentsEnabled ?? site.blogCommentSettings?.commentsEnabled ?? true,
    allowAnonymousComments: body.allowAnonymousComments ?? site.blogCommentSettings?.allowAnonymousComments ?? true,
    subscriberCommentsEnabled: body.subscriberCommentsEnabled ?? site.blogCommentSettings?.subscriberCommentsEnabled ?? false,
    requireApproval: body.requireApproval ?? site.blogCommentSettings?.requireApproval ?? false,
    autoCloseAfterDays: body.autoCloseAfterDays !== undefined ? body.autoCloseAfterDays : (site.blogCommentSettings?.autoCloseAfterDays ?? null),
    notifyEmail: body.notifyEmail ?? site.blogCommentSettings?.notifyEmail ?? true,
    notificationEmail: body.notificationEmail !== undefined ? body.notificationEmail : site.blogCommentSettings?.notificationEmail,
    allowLikes: body.allowLikes ?? site.blogCommentSettings?.allowLikes ?? true,
    allowThreadedReplies: body.allowThreadedReplies ?? site.blogCommentSettings?.allowThreadedReplies ?? true,
    sortOrder: ['newest', 'oldest', 'most_liked'].includes(body.sortOrder ?? '') ? body.sortOrder : 'newest',
  }

  if (typeof body.squarespaceApiKey === 'string' && body.squarespaceApiKey.trim().length > 0) {
    try {
      updates.squarespaceApiKeyEnc = encrypt(body.squarespaceApiKey.trim())
    } catch (err) {
      console.error('[comment-settings] Encryption failed:', err)
      res.status(500).json({ error: 'Failed to store API key' })
      return
    }
  }

  if (updates.subscriberCommentsEnabled === true && !updates.squarespaceApiKeyEnc && !site.squarespaceApiKeyEnc && !legacyApiKey) {
    res.status(400).json({ error: 'Verified API key is required to enable subscriber comments' })
    return
  }

  // Normalize 0 and undefined to null (UI uses 0 for "Never"; modal omits field)
  const raw = updates.autoCloseAfterDays
  if (raw === 0 || raw === undefined || raw === null) {
    updates.autoCloseAfterDays = null
  } else if (typeof raw !== 'number' || raw < 1 || raw > 365) {
    console.error('[comment-settings] Invalid autoCloseAfterDays:', { raw, type: typeof raw })
    res.status(400).json({ error: 'autoCloseAfterDays must be null or between 1 and 365' })
    return
  }

  const createData = {
    siteId: site.id,
    commentsEnabled: updates.commentsEnabled as boolean,
    allowAnonymousComments: updates.allowAnonymousComments as boolean,
    subscriberCommentsEnabled: updates.subscriberCommentsEnabled as boolean,
    requireApproval: updates.requireApproval as boolean,
    autoCloseAfterDays: updates.autoCloseAfterDays as number | null,
    notifyEmail: updates.notifyEmail as boolean,
    notificationEmail: updates.notificationEmail as string | null,
    allowLikes: updates.allowLikes as boolean,
    allowThreadedReplies: updates.allowThreadedReplies as boolean,
    sortOrder: updates.sortOrder as string,
  }

  const updateData: {
    commentsEnabled?: boolean
    allowAnonymousComments?: boolean
    subscriberCommentsEnabled?: boolean
    requireApproval?: boolean
    autoCloseAfterDays?: number | null
    notifyEmail?: boolean
    notificationEmail?: string | null
    allowLikes?: boolean
    allowThreadedReplies?: boolean
    sortOrder?: string
  } = {
    commentsEnabled: updates.commentsEnabled as boolean,
    allowAnonymousComments: updates.allowAnonymousComments as boolean,
    subscriberCommentsEnabled: updates.subscriberCommentsEnabled as boolean,
    requireApproval: updates.requireApproval as boolean,
    autoCloseAfterDays: updates.autoCloseAfterDays as number | null,
    notifyEmail: updates.notifyEmail as boolean,
    notificationEmail: updates.notificationEmail as string | null,
    allowLikes: updates.allowLikes as boolean,
    allowThreadedReplies: updates.allowThreadedReplies as boolean,
    sortOrder: updates.sortOrder as string,
  }
  await prisma.blogCommentSettings.upsert({
    where: { siteId: site.id },
    create: createData,
    update: updateData,
  })

  if (updates.squarespaceApiKeyEnc !== undefined) {
    await prisma.site.update({
      where: { id: site.id },
      data: { squarespaceApiKeyEnc: updates.squarespaceApiKeyEnc as string },
    })
  }

  res.json({ ok: true })
})

// POST /api/dashboard/settings/comments/verify-api-key
router.post('/verify-api-key', requireSession, async (req: Request, res: Response) => {
  const { user } = req as Request & { user: SessionUser }
  const body = req.body as { siteKey?: string; apiKey?: string }

  const siteKey = typeof body.siteKey === 'string' ? body.siteKey.trim() : null
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : null

  if (!siteKey || !apiKey) {
    res.status(400).json({ error: 'siteKey and apiKey are required' })
    return
  }

  const site = await getSiteForUser(siteKey, user.id)
  if (!site) {
    res.status(404).json({ error: 'Site not found' })
    return
  }

  try {
    const resAuth = await fetch('https://api.squarespace.com/1.0/authorization/website', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!resAuth.ok) {
      const text = await resAuth.text()
      if (resAuth.status === 401) {
        res.json({ valid: false, error: 'INVALID_KEY' })
        return
      }
      res.json({ valid: false, error: 'API_ERROR', message: text || resAuth.statusText })
      return
    }

    const auth = (await resAuth.json()) as Record<string, unknown>
    const authForLog = JSON.stringify(auth, null, 2)
    console.log('[comment-settings] Squarespace authorization response:', authForLog)

    // Support both API key flows: Developer Tools (newer) and Advanced (older).
    // Permissions may be in different shapes: permissions[], scopes[], or nested [{ api, level }].
    const permsRaw: string[] = []
    const arraysToCheck = [auth?.permissions, auth?.scopes, auth?.grantedPermissions].filter(Array.isArray)
    for (const arr of arraysToCheck) {
      for (const p of arr as Array<string | Record<string, unknown>>) {
        if (typeof p === 'string') permsRaw.push(p)
        else if (p && typeof p === 'object' && 'api' in p) permsRaw.push(String((p as { api?: string }).api))
      }
    }

    const hasProfilePermission = permsRaw.some((p: string) =>
      p && typeof p === 'string' && p.toLowerCase().replace(/[-_:]/g, '').includes('profile')
    )

    if (!hasProfilePermission) {
      // Fallback: try Profiles API directly (keys from newer Developer Tools flow may use different auth format)
      console.log('[comment-settings] No profile permission in auth response, trying Profiles API fallback')
      try {
        // Commerce Profiles API: GET /1.0/profiles, filter=email,{encoded} (comma-separated per Squarespace docs)
        const testEmail = encodeURIComponent('__verify_nonexistent@test.betterblog')
        const resProfiles = await fetch(
          `https://api.squarespace.com/1.0/profiles?filter=email,${testEmail}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        )
        if (resProfiles.ok) {
          console.log('[comment-settings] Profiles API fallback: key accepted (200)')
          res.json({ valid: true })
          return
        }
        if (resProfiles.status === 401) {
          console.log('[comment-settings] Profiles API fallback: 401 Unauthorized (invalid key)')
        } else if (resProfiles.status === 403) {
          console.log('[comment-settings] Profiles API fallback: 403 Forbidden (missing Profiles permission)')
        } else {
          console.log('[comment-settings] Profiles API fallback: status', resProfiles.status)
        }
      } catch (fallbackErr) {
        console.error('[comment-settings] Profiles API fallback error:', fallbackErr)
      }
      res.json({ valid: false, error: 'MISSING_PERMISSION' })
      return
    }

    res.json({ valid: true })
  } catch (err) {
    console.error('[comment-settings] API key verification error:', err)
    res.status(500).json({ valid: false, error: 'API_ERROR', message: 'Verification request failed' })
  }
})

export default router
