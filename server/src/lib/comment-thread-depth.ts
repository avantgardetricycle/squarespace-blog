import type { PrismaClient } from '../generated/prisma/client.js'

/**
 * Maximum visible thread depth, counting the top-level comment as level 1.
 * Example: root → reply → reply → reply. Further replies attach as siblings
 * of the 4th-level comment (same parent) instead of nesting deeper.
 */
export const MAX_COMMENT_THREAD_LEVELS = 4

/**
 * `ancestorsRootFirst` is the intended parent and its ancestors, root first
 * (it does not include the new comment). Returns the parent id to store so the
 * new comment’s depth is at most {@link MAX_COMMENT_THREAD_LEVELS}.
 */
export function parentIdWithinMaxThreadDepth(
  ancestorsRootFirst: string[],
  maxLevels: number = MAX_COMMENT_THREAD_LEVELS
): string | null {
  if (ancestorsRootFirst.length === 0) return null
  if (ancestorsRootFirst.length < maxLevels) {
    return ancestorsRootFirst[ancestorsRootFirst.length - 1]
  }
  return ancestorsRootFirst[maxLevels - 2]
}

export function clampParentIdsForThreadDepth<T extends { id: string; parentId: string | null }>(
  rows: T[],
  maxLevels: number = MAX_COMMENT_THREAD_LEVELS
): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]))

  function parentChainRootFirst(startId: string): string[] {
    const rev: string[] = []
    let cur: string | null = startId
    const guard = new Set<string>()
    while (cur) {
      if (guard.has(cur)) break
      guard.add(cur)
      const row = byId.get(cur)
      if (!row) break
      rev.push(row.id)
      cur = row.parentId
    }
    return rev.reverse()
  }

  return rows.map((row) => {
    if (!row.parentId) return row
    const clamped = parentIdWithinMaxThreadDepth(parentChainRootFirst(row.parentId), maxLevels)
    if (clamped === row.parentId) return row
    return { ...row, parentId: clamped }
  })
}

export async function resolveParentIdForReply(
  prisma: PrismaClient,
  args: { siteId: string; postId: string; requestedParentId: string }
): Promise<string> {
  const rows: { id: string; parentId: string | null }[] = []
  let currentId: string | null = args.requestedParentId
  const guard = new Set<string>()
  while (currentId && rows.length < 32) {
    if (guard.has(currentId)) break
    guard.add(currentId)
    const row = await prisma.comment.findFirst({
      where: { id: currentId, siteId: args.siteId, postId: args.postId },
      select: { id: true, parentId: true },
    })
    if (!row) break
    rows.push(row)
    currentId = row.parentId
  }
  const rootFirst = rows.map((r) => r.id).reverse()
  return parentIdWithinMaxThreadDepth(rootFirst) ?? args.requestedParentId
}
