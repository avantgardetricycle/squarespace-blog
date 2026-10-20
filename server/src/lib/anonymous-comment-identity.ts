export const ANONYMOUS_HANDLE_RE = /^Anonymous\d{4}$/

const PROFILE_INITIAL = /[\p{L}\p{N}]/u

function firstProfileString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function profileLastInitial(lastName: string): string {
  if (!lastName) return ''
  for (const char of Array.from(lastName)) {
    if (PROFILE_INITIAL.test(char)) return char.toLocaleUpperCase()
  }
  return ''
}

/** Public comment name from a Squarespace profile when the reader leaves the name blank. */
export function profileCommentDisplayName(profile: unknown): string {
  if (!profile || typeof profile !== 'object') return ''
  const record = profile as Record<string, unknown>
  const first = firstProfileString(record.firstName, record.first_name)
  const last = firstProfileString(record.lastName, record.last_name)
  const initial = profileLastInitial(last)
  if (first && initial) return `${first} ${initial}.`
  if (first) return first
  if (initial) return `${initial}.`
  return ''
}

/** Name stored on a verified comment. A profile with no usable name stays anonymous. */
export function commenterNameFromProfile(profile: unknown): string {
  return profileCommentDisplayName(profile) || 'Anonymous'
}

export type AnonymousIdentityDecision = {
  generatedHandle: string | null
  useAnonymousIdentity: boolean
  memberEmailAttempt: boolean
}

export function decideAnonymousCommentIdentity(input: {
  allowAnonymousComments: boolean
  subscriberCommentsEnabled: boolean
  displayNameRaw: string
  anonymousHandleRaw: string
  email: string | null
  postAsAnonymous: boolean
}): AnonymousIdentityDecision {
  const anonymousHandleBody = input.anonymousHandleRaw.trim()
  const displayNameRaw = input.displayNameRaw.trim()
  const generatedHandle = !input.allowAnonymousComments
    ? null
    : ANONYMOUS_HANDLE_RE.test(anonymousHandleBody)
      ? anonymousHandleBody
      : ANONYMOUS_HANDLE_RE.test(displayNameRaw)
        ? displayNameRaw
        : null
  const useAnonymousIdentity =
    input.allowAnonymousComments &&
    (!input.subscriberCommentsEnabled || generatedHandle != null)
  const memberEmailAttempt =
    !useAnonymousIdentity && !input.postAsAnonymous && !displayNameRaw && Boolean(input.email)
  return { generatedHandle, useAnonymousIdentity, memberEmailAttempt }
}

export type FinalizedCommentIdentity = {
  displayName: string
  email: string | null
  verifiedSubscriber: boolean
  squarespaceProfileId: string | null
}

export function finalizeCommentIdentity(input: {
  useAnonymousIdentity: boolean
  generatedHandle: string | null
  displayName: string
  email: string | null
  verifiedSubscriber: boolean
  squarespaceProfileId: string | null
}): FinalizedCommentIdentity {
  if (input.useAnonymousIdentity) {
    return {
      displayName: input.generatedHandle || 'Anonymous',
      email: null,
      verifiedSubscriber: false,
      squarespaceProfileId: null,
    }
  }
  if (!input.verifiedSubscriber) {
    return {
      displayName: 'Anonymous',
      email: null,
      verifiedSubscriber: false,
      squarespaceProfileId: input.squarespaceProfileId,
    }
  }
  return {
    displayName: input.displayName || 'Anonymous',
    email: input.email,
    verifiedSubscriber: true,
    squarespaceProfileId: input.squarespaceProfileId,
  }
}
