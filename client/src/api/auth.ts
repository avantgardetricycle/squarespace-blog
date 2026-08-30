const API = '/api'

export type SitePaywallSettingsJson = {
  subscribeUrl: string | null
  footerDescription: string | null
  eyebrowText: string | null
  headlineText: string | null
  featureItems: string[]
}

export interface DashboardMe {
  user: { id: number; email: string; name: string | null; createdAt: string }
  subscription: {
    plan: string
    /** Display name: Essentials, Professional, Publication (server adds; client falls back if missing) */
    planDisplay?: string
    cadence: string
    priceDisplay: string
    status: string
    maxSites: number | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
  sites: Array<{
    id: string
    siteKey: string
    name: string | null
    url: string | null
    blogPath: string | null
    hasBlogPassword?: boolean
    paywallMode?: 'auto' | 'force_logged_out' | 'force_logged_in'
    paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
    paywallDetectionSource?: 'json_probe' | 'manual' | null
    paywallSettings?: SitePaywallSettingsJson | null
    status: string
    verificationStatus: 'pending' | 'verified' | 'needs_attention'
    squarespaceApiKeyInvalid?: boolean
    createdAt: string
  }>
  canCreateSite: boolean
  isSupportTeam?: boolean
}

export async function getDashboardMe(): Promise<DashboardMe | null> {
  const res = await fetch(`${API}/dashboard/me`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export async function updateProfile(data: { name?: string | null }): Promise<{ id: number; email: string; name: string | null; createdAt: string } | null> {
  const res = await fetch(`${API}/dashboard/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  })
  if (!res.ok) return null
  return res.json()
}

export interface CreatedSite {
  id: string
  siteKey: string
  name: string | null
  url: string | null
  blogPath: string | null
  paywallMode?: 'auto' | 'force_logged_out' | 'force_logged_in'
  paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
  paywallDetectionSource?: 'json_probe' | 'manual' | null
  status: string
  verificationStatus: 'pending' | 'verified' | 'needs_attention'
  createdAt: string
  /** Present when API returns a previously soft-deleted site match (409 deleted_blog_url_match). */
  deletedAt?: string | null
  paywallSettings?: SitePaywallSettingsJson | null
}

export type CreateSiteResult =
  | { site: CreatedSite }
  | { site: null; error: string; code?: 'blog_url_unreachable' }
  | {
      site: null
      conflict: 'active_duplicate'
      existingSite: CreatedSite
      message: string
    }
  | {
      site: null
      conflict: 'deleted_previous'
      existingSite: CreatedSite
      message: string
    }

export async function createSite(
  name?: string,
  url?: string,
  paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled',
  subscribeUrl?: string,
  options?: { purgeDeletedSiteId?: string }
): Promise<CreateSiteResult> {
  const body: Record<string, unknown> = {
    name: name?.trim() || undefined,
    url: url?.trim() || undefined,
    paywallDetectionState
  }
  if (typeof subscribeUrl === 'string' && subscribeUrl.trim()) {
    body.subscribeUrl = subscribeUrl.trim()
  }
  if (typeof options?.purgeDeletedSiteId === 'string' && options.purgeDeletedSiteId.trim()) {
    body.purgeDeletedSiteId = options.purgeDeletedSiteId.trim()
  }
  const res = await fetch(`${API}/dashboard/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    message?: string
    existingSite?: CreatedSite
  } &
    Partial<CreatedSite>

  if (res.status === 409 && data.error === 'duplicate_blog_url' && data.existingSite) {
    return {
      site: null,
      conflict: 'active_duplicate',
      existingSite: data.existingSite,
      message:
        typeof data.message === 'string'
          ? data.message
          : 'You already have an active BetterBlog site for this blog URL.'
    }
  }

  if (res.status === 409 && data.error === 'deleted_blog_url_match' && data.existingSite) {
    return {
      site: null,
      conflict: 'deleted_previous',
      existingSite: data.existingSite,
      message:
        typeof data.message === 'string'
          ? data.message
          : 'You previously removed a BetterBlog site with this same blog URL.'
    }
  }

  if (!res.ok) {
    if (data.error === 'blog_url_unreachable') {
      return {
        site: null,
        error:
          typeof data.message === 'string'
            ? data.message
            : "We couldn't reach your blog at the URL you provided. Make sure you entered the full URL and try again.",
        code: 'blog_url_unreachable'
      }
    }
    return { site: null, error: typeof data.error === 'string' ? data.error : 'Failed to create site' }
  }
  return { site: data as CreatedSite }
}

export async function restoreSite(
  siteId: string,
  name?: string
): Promise<{ site: CreatedSite } | { error: string }> {
  const res = await fetch(`${API}/dashboard/sites/${encodeURIComponent(siteId)}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(name?.trim() ? { name: name.trim() } : {})
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<CreatedSite>
  if (!res.ok) {
    return { error: typeof data.error === 'string' ? data.error : 'Failed to restore site' }
  }
  return { site: data as CreatedSite }
}

export async function deleteSite(siteId: string): Promise<boolean> {
  const res = await fetch(`${API}/dashboard/sites/${siteId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  return res.ok
}

export async function createPortalSession(): Promise<{ url?: string; error?: string }> {
  const res = await fetch(`${API}/dashboard/subscription/portal`, {
    method: 'POST',
    credentials: 'include'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: data?.error ?? 'Failed to open billing portal' }
  }
  return { url: data.url }
}

export async function cancelSubscription(): Promise<{ success: boolean; error?: string; currentPeriodEnd?: string }> {
  const res = await fetch(`${API}/dashboard/subscription/cancel`, {
    method: 'POST',
    credentials: 'include'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: data?.error ?? 'Failed to cancel subscription' }
  }
  return { success: true, currentPeriodEnd: data.currentPeriodEnd }
}

export async function resumeSubscription(): Promise<{ success: boolean; error?: string; currentPeriodEnd?: string }> {
  const res = await fetch(`${API}/dashboard/subscription/resume`, {
    method: 'POST',
    credentials: 'include'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: data?.error ?? 'Failed to restore subscription' }
  }
  return { success: true, currentPeriodEnd: data.currentPeriodEnd }
}

/** Response body from PATCH /dashboard/sites/by-key/:siteKey */
export type SitePatchResponse = {
  id: string
  siteKey: string
  name: string | null
  url: string | null
  blogPath: string | null
  hasBlogPassword?: boolean
  paywallMode?: 'auto' | 'force_logged_out' | 'force_logged_in'
  paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
  paywallDetectionSource?: 'json_probe' | 'manual' | null
  status: string
  verificationStatus: 'pending' | 'verified' | 'needs_attention'
  createdAt: string
  paywallSettings?: SitePaywallSettingsJson | null
}

export type PaywallReconcileMismatch = {
  siteId: string
  siteKey: string
  name: string | null
  storedState: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
  probedState: 'detected_paywalled' | 'detected_unpaywalled'
  signals: string[]
}

export async function getPaywallReconcile(): Promise<{ mismatches: PaywallReconcileMismatch[] } | null> {
  try {
    const res = await fetch(`${API}/dashboard/paywall-reconcile`, { credentials: 'include' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateSite(
  siteKey: string,
  updates: {
    name?: string | null
    blogPassword?: string
    paywallMode?: 'auto' | 'force_logged_out' | 'force_logged_in'
    paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
    paywallDetectionSource?: 'json_probe' | 'manual'
    subscribeUrl?: string | null
  }
): Promise<{ ok: true; site: SitePatchResponse } | { ok: false; error?: string }> {
  const res = await fetch(`${API}/dashboard/sites/by-key/${encodeURIComponent(siteKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates)
  })
  if (!res.ok) {
    let error = 'Failed to update site'
    try {
      const data = await res.json()
      if (data?.error) error = data.error
    } catch {
      /* ignore */
    }
    return { ok: false, error }
  }
  const site = (await res.json()) as SitePatchResponse
  return { ok: true, site }
}
