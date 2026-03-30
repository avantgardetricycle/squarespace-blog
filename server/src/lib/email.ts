import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { getLogoBase64, renderInviteEmail, renderMagicLinkEmail, renderCommentNotificationEmail } from '../emails/index.js'
import { getAppUrl } from './url.js'

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

/** Send notification to site owner: new newsletter subscriber */
export async function sendNewSubscriberNotification(
  to: string,
  siteName: string,
  subscriberEmail: string,
  subscriberName?: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  const displayName = subscriberName?.trim() ? `${subscriberName} (${subscriberEmail})` : subscriberEmail
  const siteLabel = siteName?.trim() || 'your blog'

  if (!apiKey) {
    console.log(`[Capture] SENDGRID_API_KEY not set. New subscriber for ${siteLabel}: ${displayName}`)
    return
  }

  sgMail.setApiKey(apiKey)

  const html = `
    <h2>New newsletter subscriber</h2>
    <p>You have a new subscriber on ${siteLabel}:</p>
    <p><strong>${displayName}</strong></p>
    <p>You can view and download your subscribers in the Analytics dashboard.</p>
  `

  try {
    await sgMail.send({
      to,
      from: mailFrom,
      subject: `New newsletter subscriber on ${siteLabel}`,
      html,
      trackingSettings: { clickTracking: { enable: false } },
    })
  } catch (err) {
    console.error('[Capture] SendGrid error sending subscriber notification:', err)
  }
}

/** Send notification to site owner: new lead magnet signup */
export async function sendNewLeadMagnetNotification(
  to: string,
  siteName: string,
  subscriberEmail: string,
  resourceTitle: string,
  subscriberName?: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  const displayName = subscriberName?.trim() ? `${subscriberName} (${subscriberEmail})` : subscriberEmail
  const siteLabel = siteName?.trim() || 'your blog'

  if (!apiKey) {
    console.log(`[Capture] SENDGRID_API_KEY not set. New lead magnet signup for "${resourceTitle}" on ${siteLabel}: ${displayName}`)
    return
  }

  sgMail.setApiKey(apiKey)

  const html = `
    <h2>New lead magnet signup</h2>
    <p>Someone signed up for <strong>${resourceTitle}</strong> on ${siteLabel}:</p>
    <p><strong>${displayName}</strong></p>
    <p>You can view and download your leads in the Analytics dashboard.</p>
  `

  try {
    await sgMail.send({
      to,
      from: mailFrom,
      subject: `New lead magnet signup: ${resourceTitle}`,
      html,
      trackingSettings: { clickTracking: { enable: false } },
    })
  } catch (err) {
    console.error('[Capture] SendGrid error sending lead magnet notification:', err)
  }
}

/** Send notification to blogger: new comment or comment approved */
export async function sendCommentNotificationEmail(
  to: string,
  displayName: string,
  postTitle: string,
  commentExcerpt: string,
  siteKey: string,
  commentId: string,
  commentStatus: 'pending' | 'approved'
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(`[Comment] SENDGRID_API_KEY not set. New comment from ${displayName} on "${postTitle}"`)
    return
  }

  const base = getAppUrl().replace(/\/+$/, '')
  const viewUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey,
    highlight: commentId,
  }).toString()}`
  const approveUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey,
    moderate: 'approve',
    commentId,
  }).toString()}`
  const spamUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey,
    moderate: 'spam',
    commentId,
  }).toString()}`
  const hideUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey,
    moderate: 'hide',
    commentId,
  }).toString()}`

  sgMail.setApiKey(apiKey)

  const html = await renderCommentNotificationEmail({
    displayName,
    postTitle,
    commentExcerpt,
    viewUrl,
    commentStatus,
    approveUrl,
    spamUrl,
    hideUrl,
  })

  try {
    await sgMail.send({
      to,
      from: mailFrom,
      subject: `New comment on "${postTitle}"`,
      html,
      trackingSettings: { clickTracking: { enable: false } },
    })
  } catch (err) {
    console.error('[Comment] SendGrid error sending comment notification:', err)
  }
}
