/**
 * Fetch Squarespace GetComments JSON from the customer's published site and lazy-import rows into Comment.
 */
import type { PrismaClient } from '../generated/prisma/client.js'

type RawRow = Record<string, unknown>

function unwrapRow(raw: unknown): RawRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as RawRow
  const inner = o.comment
  if (inner && typeof inner === 'object') return inner as RawRow
  return o
}

function ssApproved(status: unknown): boolean {
  if (status === undefined || status === null) return true
  return status === 1 || status === 'APPROVED'
}

function parseSquarespaceCreatedAt(r: RawRow): Date {
  const candidates = [r.createdOn, r.addedOn, r.updatedOn, r.createdTimestamp, r.publishedOn]
  for (const v of candidates) {
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'string') {
      const p = Date.parse(v.trim())
      if (!Number.isNaN(p)) return new Date(p)
      const num = parseFloat(v)
      if (!Number.isNaN(num) && num > 0) {
        return new Date(num < 1e11 ? Math.round(num * 1000) : Math.round(num))
      }
      continue
    }
    if (typeof v === 'number' && !Number.isNaN(v) && v > 0) {
      return new Date(v < 1e11 ? Math.round(v * 1000) : Math.round(v))
    }
  }
  return new Date()
}

function appendPasswordToUrl(url: string, password: string | null | undefined): string {
  if (!password || !String(password).trim()) return url
  try {
    const u = new URL(url)
    u.searchParams.set('password', String(password).trim())
    return u.toString()
  } catch {
    return url
  }
}

export async function fetchAllSquarespaceCommentsForPost(options: {
  siteUrl: string | null | undefined
  postItemId: string
  recordType: number
  blogPassword?: string | null
}): Promise<RawRow[]> {
  const { siteUrl, postItemId, recordType, blogPassword } = options
  if (!siteUrl || !String(siteUrl).trim()) return []
  let origin: string
  try {
    const u = new URL(siteUrl.startsWith('http') ? siteUrl.trim() : `https://${siteUrl.trim()}`)
    origin = u.origin
  } catch {
    return []
  }

  const all: RawRow[] = []
  let page = 1
  const maxPages = 60
  while (page <= maxPages) {
    const params = new URLSearchParams({
      targetId: postItemId,
      targetType: String(recordType),
      page: String(page),
      since: '',
      sortBy: '',
    })
    let url = `${origin}/api/comment/GetComments?${params.toString()}`
    url = appendPasswordToUrl(url, blogPassword ?? null)
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    })
    if (!res.ok) break
    const data = (await res.json()) as { comments?: unknown[] }
    const chunk = Array.isArray(data?.comments) ? data.comments : []
    for (const row of chunk) {
      const u = unwrapRow(row)
      if (u) all.push(u)
    }
    if (chunk.length === 0) break
    page++
  }
  return all
}

/** Build chain from target up to root (SS parentId), then reverse to root-first order. */
function buildAncestorChain(rows: RawRow[], targetExternalId: string): RawRow[] | null {
  const byId = new Map<string, RawRow>()
  for (const r of rows) {
    const id = r.id !== undefined && r.id !== null ? String(r.id) : ''
    if (!id || !ssApproved(r.status)) continue
    byId.set(id, r)
  }
  if (!byId.has(targetExternalId)) return null

  const chainRev: RawRow[] = []
  let cur: string | null = targetExternalId
  const guard = new Set<string>()
  while (cur) {
    if (guard.has(cur)) return null
    guard.add(cur)
    const row = byId.get(cur)
    if (!row) return null
    chainRev.push(row)
    const pid = row.parentId
    cur = pid !== undefined && pid !== null && String(pid).trim() !== '' ? String(pid) : null
  }
  return chainRev.reverse()
}

export async function importSquarespaceCommentChain(
  prisma: PrismaClient,
  siteId: string,
  postId: string,
  targetExternalId: string,
  flatRows: RawRow[]
): Promise<string | null> {
  const chain = buildAncestorChain(flatRows, targetExternalId)
  if (!chain || chain.length === 0) return null

  const idMap = new Map<string, string>()

  return prisma.$transaction(async (tx) => {
    for (const row of chain) {
      const extId = row.id !== undefined && row.id !== null ? String(row.id) : ''
      if (!extId) continue

      const parentExt =
        row.parentId !== undefined && row.parentId !== null && String(row.parentId).trim() !== ''
          ? String(row.parentId)
          : null
      const prismaParentId = parentExt ? idMap.get(parentExt) ?? null : null

      const displayName =
        typeof row.authorName === 'string' && row.authorName.trim()
          ? row.authorName.trim().slice(0, 100)
          : 'Anonymous'
      const body = typeof row.body === 'string' ? row.body : ''
      const createdAt = parseSquarespaceCreatedAt(row)

      const saved = await tx.comment.upsert({
        where: {
          comments_site_post_external_id: {
            siteId,
            postId,
            externalCommentId: extId,
          },
        },
        create: {
          siteId,
          postId,
          parentId: prismaParentId,
          displayName,
          body,
          status: 'approved',
          autoApproved: true,
          importedFromSquarespace: true,
          externalCommentId: extId,
          createdAt,
        },
        update: {
          displayName,
          body,
          parentId: prismaParentId,
          updatedAt: new Date(),
        },
      })
      idMap.set(extId, saved.id)
    }

    return idMap.get(targetExternalId) ?? null
  })
}

export async function resolveSquarespaceParentForReply(
  prisma: PrismaClient,
  options: {
    siteId: string
    postId: string
    siteUrl: string | null | undefined
    blogPassword?: string | null
    squarespaceParentId: string
    recordType?: number
  }
): Promise<string | null> {
  const existing = await prisma.comment.findFirst({
    where: {
      siteId: options.siteId,
      postId: options.postId,
      externalCommentId: options.squarespaceParentId,
      status: 'approved',
    },
  })
  if (existing) return existing.id

  const recordType = options.recordType ?? 1
  const rows = await fetchAllSquarespaceCommentsForPost({
    siteUrl: options.siteUrl,
    postItemId: options.postId,
    recordType,
    blogPassword: options.blogPassword,
  })
  if (rows.length === 0) return null
  return importSquarespaceCommentChain(
    prisma,
    options.siteId,
    options.postId,
    options.squarespaceParentId,
    rows
  )
}
