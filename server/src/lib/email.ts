import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { getLogoBase64, renderInviteEmail, renderMagicLinkEmail, renderCommentNotificationEmail, renderProfilesApiAlertEmail, renderTrialDayFourEmail } from '../emails/index.js'
import { signCommentActionToken, type CommentAction } from './comment-action-token.js'
import { redactSubscriberText } from './email-providers.js'
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
const mailFrom = process.env.SENDGRID_MAIL_FROM ?? 'BetterBlog <support@betterblog.co>'
const inviteEmailSubject = 'Your BetterBlog access link'

function describeForLog(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : (() => {
            try {
              return JSON.stringify(value)
            } catch {
              return 'unserializable error'
            }
          })()
  return redactSubscriberText(text || 'unknown error')
}

/** Local dev can print the link. Production logs must not include the address or the token. */
function logMagicLinkFallback(label: string, magicLink: string): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(`[${label}] not sent (mailer not configured)`)
    return
  }
  console.log(`[${label}] mailer not configured. Magic link: ${magicLink}`)
}

/** Send invite email via nodemailer (used by manual /api/auth/invite) */
export async function sendInviteEmail(to: string, magicLink: string): Promise<void> {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    logMagicLinkFallback('Invite', magicLink)
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
    logMagicLinkFallback('Invite', magicLink)
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
    console.error('[Invite] SendGrid error:', describeForLog(errors ?? err))
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
    logMagicLinkFallback('MagicLink', magicLink)
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
    console.error('[MagicLink] SendGrid error:', describeForLog(errors ?? err))
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
    console.log(`[Capture] SENDGRID_API_KEY not set. Subscriber notification not sent for ${siteLabel}`)
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
    console.error('[Capture] SendGrid error sending subscriber notification:', describeForLog(err))
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
    console.log(`[Capture] SENDGRID_API_KEY not set. Lead magnet notification not sent for "${resourceTitle}" on ${siteLabel}`)
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
    console.error('[Capture] SendGrid error sending lead magnet notification:', describeForLog(err))
  }
}

function dashboardCommentActionUrl(
  base: string,
  siteKey: string,
  commentId: string,
  action: CommentAction
): string {
  const token = signCommentActionToken(commentId, action)
  const params = new URLSearchParams({ siteKey, token })
  if (action === 'view') {
    params.set('highlight', commentId)
  } else {
    params.set('moderate', action)
    params.set('commentId', commentId)
  }
  return `${base}/dashboard/comments?${params.toString()}`
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
    console.log(`[Comment] SENDGRID_API_KEY not set. Comment notification not sent for "${postTitle}"`)
    return
  }

  const base = getAppUrl().replace(/\/+$/, '')
  const viewUrl = dashboardCommentActionUrl(base, siteKey, commentId, 'view')
  const approveUrl = dashboardCommentActionUrl(base, siteKey, commentId, 'approve')
  const spamUrl = dashboardCommentActionUrl(base, siteKey, commentId, 'spam')
  const hideUrl = dashboardCommentActionUrl(base, siteKey, commentId, 'hide')
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
    console.error('[Comment] SendGrid error sending comment notification:', describeForLog(errors ?? err))
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
    }
  }
}

export async function sendProfilesApiAlertEmail(
  to: string[],
  details: {
    siteName: string
    siteUrl: string | null
    siteKey: string
    status: number | null
    reason: string
    errorBodySnippet: string | null
    emailDomain: string | null
    emailHasPlus: boolean
  }
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey || to.length === 0) {
    console.log('[BetterBlog alert] SENDGRID_API_KEY missing or no recipients; skipping Profiles API alert email', {
      siteKey: details.siteKey,
      reason: details.reason,
      recipientCount: to.length,
    })
    return
  }

  const base = getAppUrl().replace(/\/+$/, '')
  const commentSettingsUrl = `${base}/dashboard/comments?${new URLSearchParams({
    siteKey: details.siteKey,
  }).toString()}#comment-settings`

  sgMail.setApiKey(apiKey)
  const html = await renderProfilesApiAlertEmail({
    ...details,
    commentSettingsUrl,
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
    subject: `Squarespace API key failed for ${details.siteName}`,
    html,
    attachments: [logoAttachment],
    trackingSettings: { clickTracking: { enable: false } },
  }
  try {
    await sgMail.send(msg)
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { body?: { errors?: unknown } } }).response : undefined
    const errors = res?.body?.errors
    console.error('[BetterBlog alert] SendGrid error sending Profiles API alert:', describeForLog(errors ?? err))
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
    }
  }
}

/** Day-4 free-trial reminder. Throws when SendGrid rejects the message so the cron can retry. */
export async function sendTrialDayFourEmail(
  to: string,
  details: {
    trialEndDate: string
    loginUrl: string
    recipientName?: string | null
  }
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(
      `[Trial] SENDGRID_API_KEY not set. Day-4 reminder for ${to}; trial ends ${details.trialEndDate}; login ${details.loginUrl}`
    )
    return
  }

  sgMail.setApiKey(apiKey)
  const html = await renderTrialDayFourEmail({
    trialEndDate: details.trialEndDate,
    loginUrl: details.loginUrl,
    supportUrl: getSupportPortalUrl(),
    recipientName: details.recipientName,
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
    subject: `Your BetterBlog free trial ends on ${details.trialEndDate}`,
    html,
    attachments: [logoAttachment],
    trackingSettings: { clickTracking: { enable: false } },
  }
  try {
    await sgMail.send(msg)
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { body?: { errors?: unknown } } }).response : undefined
    const errors = res?.body?.errors
    console.error('[Trial] SendGrid error sending day-4 reminder:', errors ?? err)
    if (res && typeof (res as { statusCode?: number }).statusCode === 'number' && (res as { statusCode: number }).statusCode === 400) {
      const { attachments: _, ...msgWithoutLogo } = msg
      await sgMail.send(msgWithoutLogo)
      return
    }
    throw err
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
  const supportTo = process.env.SUPPORT_EMAIL ?? 'support@betterblog.co'
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
    console.log(`[Support] SENDGRID_API_KEY not set. ${modeLabel} not sent`)
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
    console.error('[Support] SendGrid error:', describeForLog(err))
    throw err
  }
}

export interface SupportTicketEmailPayload {
  ticketId: string
  accountEmail: string
  accountName: string | null
  subject: string
  description: string
  blogUrl: string | null
  conversationId: string | null
  screenshotUrl?: string
}

/** Notify the support inbox of a dashboard Support tab ticket. */
export async function sendSupportTicketEmail(payload: SupportTicketEmailPayload): Promise<void> {
  const supportTo = process.env.SUPPORT_EMAIL ?? 'support@betterblog.co'
  const subjectLine = `[BetterBlog Support] Ticket: ${payload.subject}`
  const fields: Array<[string, string]> = [
    ['Ticket ID', payload.ticketId],
    ['From', payload.accountName ? `${payload.accountName} <${payload.accountEmail}>` : payload.accountEmail],
    ['Subject', payload.subject],
    ...(payload.blogUrl ? ([['Blog URL', payload.blogUrl]] as Array<[string, string]>) : []),
    ...(payload.conversationId
      ? ([['Conversation ID', payload.conversationId]] as Array<[string, string]>)
      : []),
    ...(payload.screenshotUrl ? ([['Screenshot', payload.screenshotUrl]] as Array<[string, string]>) : []),
    ['Description', payload.description],
  ]

  const html = `
    <h2>New support ticket</h2>
    ${fields
      .map(([label, value]) => `<p><strong>${label}:</strong><br/>${value.replace(/\n/g, '<br/>')}</p>`)
      .join('\n')}
  `
  const text = fields.map(([label, value]) => `${label}: ${value}`).join('\n\n')

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.log(`[Support ticket] SENDGRID_API_KEY not set. Ticket ${payload.ticketId} not sent`)
    return
  }

  sgMail.setApiKey(apiKey)

  try {
    await sgMail.send({
      to: supportTo,
      from: mailFrom,
      replyTo: payload.accountEmail,
      subject: subjectLine,
      text,
      html,
      trackingSettings: { clickTracking: { enable: false } },
    })
  } catch (err) {
    console.error('[Support ticket] SendGrid error:', describeForLog(err))
    throw err
  }
}
