export type VerificationSession = {
  email: string
  displayName: string
  customName: boolean
}

/**
 * A stored member session supplies the email for Profiles lookup.
 * A name the reader typed is reused. A blank name is left blank so the
 * profile can be formatted again (first name plus last initial).
 */
export function applyVerificationSession(input: {
  email: string | null
  subscriberDisplayName: string
  session: VerificationSession | null
}): { email: string | null; subscriberDisplayName: string; customName: boolean } {
  const typedName = input.subscriberDisplayName.trim()
  if (input.email) {
    return {
      email: input.email,
      subscriberDisplayName: typedName,
      customName: typedName.length > 0,
    }
  }
  if (!input.session || !input.session.email) {
    return {
      email: null,
      subscriberDisplayName: typedName,
      customName: typedName.length > 0,
    }
  }
  const customName = input.session.customName || typedName.length > 0
  const subscriberDisplayName =
    typedName || (input.session.customName ? input.session.displayName.trim() : '')
  return {
    email: input.session.email,
    subscriberDisplayName,
    customName,
  }
}
