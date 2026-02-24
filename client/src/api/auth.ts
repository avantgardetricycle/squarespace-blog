const API = '/api'

export interface DashboardMe {
  user: { id: number; email: string; createdAt: string }
  subscription: {
    plan: string
    status: string
    maxSites: number | null
    currentPeriodEnd: string | null
  } | null
  sites: Array<{
    id: string
    siteKey: string
    name: string | null
    url: string | null
    status: string
    createdAt: string
  }>
  canCreateSite: boolean
}

export async function getDashboardMe(): Promise<DashboardMe | null> {
  const res = await fetch(`${API}/dashboard/me`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export interface CreatedSite {
  id: string
  siteKey: string
  name: string | null
  url: string | null
  status: string
  createdAt: string
}

export async function createSite(name?: string, url?: string): Promise<CreatedSite | null> {
  const res = await fetch(`${API}/dashboard/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: name?.trim() || undefined,
      url: url?.trim() || undefined
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
