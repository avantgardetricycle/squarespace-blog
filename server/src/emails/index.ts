import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { render } from '@react-email/render'
import { InviteEmail } from './InviteEmail.js'
import { MagicLinkEmail } from './MagicLinkEmail.js'
import { CommentNotificationEmail } from './CommentNotificationEmail.js'
import { ProfilesApiAlertEmail } from './ProfilesApiAlertEmail.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoPath = join(__dirname, 'logo-email.png')

/** Base64 logo for SendGrid inline attachment - avoids src stripping by email clients */
export function getLogoBase64(): string {
  return readFileSync(logoPath).toString('base64')
}

export async function renderInviteEmail(magicLink: string, supportUrl?: string): Promise<string> {
  return render(InviteEmail({ magicLink, supportUrl }))
}

export async function renderMagicLinkEmail(magicLink: string, supportUrl?: string): Promise<string> {
  return render(MagicLinkEmail({ magicLink, supportUrl }))
}

export async function renderCommentNotificationEmail(props: {
  displayName: string
  postTitle: string
  commentExcerpt: string
  viewUrl: string
  commentSettingsUrl: string
  commentStatus: 'pending' | 'approved'
  approveUrl: string
  spamUrl: string
  hideUrl: string
}): Promise<string> {
  return render(CommentNotificationEmail(props))
}

export async function renderProfilesApiAlertEmail(props: {
  siteName: string
  siteUrl: string | null
  siteKey: string
  status: number | null
  reason: string
  errorBodySnippet: string | null
  emailDomain: string | null
  emailHasPlus: boolean
  commentSettingsUrl: string
}): Promise<string> {
  return render(ProfilesApiAlertEmail(props))
}
