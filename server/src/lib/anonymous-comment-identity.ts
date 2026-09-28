export const ANONYMOUS_HANDLE_RE = /^Anonymous\d{4}$/

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
