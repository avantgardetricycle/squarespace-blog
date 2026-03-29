const API = '/api'

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
    status: string
    verificationStatus: 'pending' | 'verified' | 'needs_attention'
    createdAt: string
  }>
  canCreateSite: boolean
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
}

export async function createSite(
  name?: string,
  url?: string,
  paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
): Promise<CreatedSite | null> {
  const res = await fetch(`${API}/dashboard/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: name?.trim() || undefined,
      url: url?.trim() || undefined,
      paywallDetectionState,
    })
  })
  if (!res.ok) return null
  return res.json()
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
}

export async function updateSite(
  siteKey: string,
  updates: {
    name?: string | null
    blogPassword?: string
    paywallMode?: 'auto' | 'force_logged_out' | 'force_logged_in'
    paywallDetectionState?: 'unknown' | 'detected_paywalled' | 'detected_unpaywalled'
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
