export const SQUARESPACE_LOGIN_REQUIRED_MESSAGE =
  'Sign in to your account on this site to comment as a member.'

export const COMMENTER_AUTH_REQUIRED_MESSAGE = 'Confirm your email to comment.'

export function membershipNotFoundMessage(email: string): string {
  return `We couldn't find a membership for ${email}.`
}

export type ContactLookupOutcome =
  | { found: true; contactId: string }
  | { found: false; error?: string }

export type VerifiedSubmitDecision =
  | { action: 'store'; contactId: string | null }
  | {
      action: 'reject'
      status: 401 | 403 | 400
      code:
        | 'commenter_auth_required'
        | 'squarespace_login_required'
        | 'verification_failed'
        | 'verification_failed_anonymous_available'
    }

export function decideVerifiedCommentSubmit(input: {
  hasValidSession: boolean
  squarespaceLoggedIn: boolean
  hasApiKey: boolean
  contact: ContactLookupOutcome | null
  allowAnonymousComments: boolean
}): VerifiedSubmitDecision {
  if (!input.hasValidSession) {
    return { action: 'reject', status: 401, code: 'commenter_auth_required' }
  }
  if (!input.squarespaceLoggedIn) {
    return { action: 'reject', status: 403, code: 'squarespace_login_required' }
  }
  if (input.hasApiKey) {
    if (!input.contact || !input.contact.found) {
      return input.allowAnonymousComments
        ? { action: 'reject', status: 400, code: 'verification_failed_anonymous_available' }
        : { action: 'reject', status: 400, code: 'verification_failed' }
    }
    return { action: 'store', contactId: input.contact.contactId }
  }
  return { action: 'store', contactId: null }
}
