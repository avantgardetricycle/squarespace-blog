import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { getLogoBase64, renderInviteEmail, renderMagicLinkEmail, renderCommentNotificationEmail } from '../emails/index.js'
import { getAppUrl, getSupportPortalUrl } from './url.js'

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
const mailFrom = process.env.SENDGRID_MAIL_FROM ?? 'BetterBlog <support@betterblog.xyz>'
const inviteEmailSubject = 'Your BetterBlog access link'

/** Send invite email via nodemailer (used by manual /api/auth/invite) */
export async function sendInviteEmail(to: string, magicLink: string): Promise<void> {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.log(`[Invite] Magic link for ${to}: ${magicLink}`)
    return
  }

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: inviteEmailSubject,
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

  const html = await renderInviteEmail(magicLink, getSupportPortalUrl())

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
    subject: inviteEmailSubject,
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

  const html = await renderMagicLinkEmail(magicLink, getSupportPortalUrl())

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
  const commentSettingsUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey,
  }).toString()}#comment-settings`

  sgMail.setApiKey(apiKey)

  const html = await renderCommentNotificationEmail({
    displayName,
    postTitle,
    commentExcerpt,
    viewUrl,
    commentSettingsUrl,
    commentStatus,
    approveUrl,
    spamUrl,
    hideUrl,
  })

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
    subject: `New comment on "${postTitle}"`,
    html,
    attachments: [logoAttachment],
    trackingSettings: { clickTracking: { enable: false } },
  }

  try {
    await sgMail.send(msg)
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { body?: { errors?: unknown } } }).response : undefined
    const errors = res?.body?.errors
    console.error('[Comment] SendGrid error sending comment notification:', errors ?? err)
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
    }
  }
}

export interface SupportRequestPayload {
  name: string
  email: string
  mode: 'question' | 'problem'
  subject: string
  message: string
  pageUrl?: string
  screenshot?: {
    filename: string
    contentType: string
    data: string
  }
}

/** Forward a support portal form submission to the support inbox */
export async function sendSupportRequestEmail(payload: SupportRequestPayload): Promise<void> {
  const supportTo = process.env.SUPPORT_EMAIL ?? 'support@betterblog.xyz'
  const modeLabel = payload.mode === 'problem' ? 'Problem report' : 'Question'
  const subjectLine = `[BetterBlog Support] ${modeLabel}: ${payload.subject}`

  const fields = [
    ['From', `${payload.name} <${payload.email}>`],
    ['Type', modeLabel],
    ['Topic', payload.subject],
    ...(payload.pageUrl ? [['Page URL', payload.pageUrl] as const] : []),
    ['Message', payload.message],
  ]

  const html = `
    <h2>New support request</h2>
    ${fields
      .map(
        ([label, value]) =>
          `<p><strong>${label}:</strong><br/>${value.replace(/\n/g, '<br/>')}</p>`
      )
      .join('\n')}
  `

  const text = fields.map(([label, value]) => `${label}: ${value}`).join('\n\n')

  const attachments = payload.screenshot
    ? [
        {
          content: payload.screenshot.data,
          filename: payload.screenshot.filename,
          type: payload.screenshot.contentType,
          disposition: 'attachment' as const,
        },
      ]
    : undefined

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(`[Support] SENDGRID_API_KEY not set. New ${modeLabel.toLowerCase()} from ${payload.email}:\n${text}`)
    return
  }

  sgMail.setApiKey(apiKey)

  try {
    await sgMail.send({
      to: supportTo,
      from: mailFrom,
      replyTo: payload.email,
      subject: subjectLine,
      text,
      html,
      attachments,
      trackingSettings: { clickTracking: { enable: false } },
    })
  } catch (err) {
    console.error('[Support] SendGrid error:', err)
    throw err
  }
}
