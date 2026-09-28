export function parseAdminEmails(raw = process.env.ADMIN_EMAILS): string[] {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return parseAdminEmails().includes(email.trim().toLowerCase())
}
