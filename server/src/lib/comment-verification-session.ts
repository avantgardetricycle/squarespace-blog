export type VerificationSession = {
  email: string
  displayName: string
  customName: boolean
}

/** A stored member session supplies the email for a fresh Profiles lookup. */
export function applyVerificationSession(input: {
  email: string | null
  session: VerificationSession | null
}): { email: string | null } {
  if (input.email) return { email: input.email }
  if (!input.session || !input.session.email) return { email: null }
  return { email: input.session.email }
}
