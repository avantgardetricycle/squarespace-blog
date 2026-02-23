import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { render } from '@react-email/render'
import { InviteEmail } from './InviteEmail.js'
import { MagicLinkEmail } from './MagicLinkEmail.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoPath = join(__dirname, 'betterblog-logo-white-1024x1024.png')
const logoBase64 = readFileSync(logoPath).toString('base64')
const logoDataUri = `data:image/png;base64,${logoBase64}`

export async function renderInviteEmail(magicLink: string): Promise<string> {
  return render(InviteEmail({ magicLink, logoDataUri }))
}

export async function renderMagicLinkEmail(magicLink: string): Promise<string> {
  return render(MagicLinkEmail({ magicLink, logoDataUri }))
}
