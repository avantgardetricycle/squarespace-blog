export function parseTeamSupportEmails(raw = process.env.TEAM_SUPPORT_EMAILS): string[] {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isSupportTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return parseTeamSupportEmails().includes(email.trim().toLowerCase())
}
