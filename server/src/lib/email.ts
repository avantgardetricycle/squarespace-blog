import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { getLogoBase64, renderInviteEmail, renderMagicLinkEmail } from '../emails/index.js'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

const appName = process.env.APP_NAME ?? 'BetterBlog'
const mailFrom = process.env.SENDGRID_MAIL_FROM ?? 'BetterBlog <no-reply@betterblog.xyz>'

/** Send invite email via nodemailer (used by manual /api/auth/invite) */
export async function sendInviteEmail(to: string, magicLink: string): Promise<void> {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.log(`[Invite] Magic link for ${to}: ${magicLink}`)
    return
  }

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: `You're invited to ${appName}`,
    html: `
      <h1>Welcome to ${appName}</h1>
      <p>Click the link below to activate your account and get started:</p>
      <p><a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Activate Account</a></p>
      <p>Or copy this link: <a href="${magicLink}">${magicLink}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  })
}

/** Send invite email via SendGrid using InviteEmail.tsx design (used by checkout webhook) */
export async function sendInviteEmailViaSendGrid(to: string, magicLink: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(`[Invite] SENDGRID_API_KEY not set. Magic link for ${to}: ${magicLink}`)
    return
  }

  sgMail.setApiKey(apiKey)

  const html = await renderInviteEmail(magicLink)

  const logoAttachment = {
    content: getLogoBase64(),
    filename: 'logo.png',
    type: 'image/png',
    disposition: 'inline' as const,
    content_id: 'logo',
  }

  const msg = {
    to,
    from: mailFrom,
    subject: `You're invited to ${appName}`,
    html,
    attachments: [logoAttachment],
    trackingSettings: { clickTracking: { enable: false } },
  }

  try {
    await sgMail.send(msg)
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { body?: { errors?: unknown } } }).response : undefined
    const errors = res?.body?.errors
    console.error('[Invite] SendGrid error:', errors ?? err)
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
    } else {
      throw err
    }
  }
}

/** Send magic link email via SendGrid using MagicLinkEmail.tsx design (used by login page) */
export async function sendMagicLinkEmailViaSendGrid(to: string, magicLink: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(`[MagicLink] SENDGRID_API_KEY not set. Magic link for ${to}: ${magicLink}`)
    return
  }

  sgMail.setApiKey(apiKey)

  const html = await renderMagicLinkEmail(magicLink)

  const logoAttachment = {
    content: getLogoBase64(),
    filename: 'logo.png',
    type: 'image/png',
    disposition: 'inline' as const,
    content_id: 'logo',
  }

  const msg = {
    to,
    from: mailFrom,
    subject: `Sign in to ${appName}`,
    html,
    attachments: [logoAttachment],
    trackingSettings: { clickTracking: { enable: false } },
  }

  try {
    await sgMail.send(msg)
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { body?: { errors?: unknown } } }).response : undefined
    const errors = res?.body?.errors
    console.error('[MagicLink] SendGrid error:', errors ?? err)
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
    } else {
      throw err
    }
  }
}
