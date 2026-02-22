import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

export async function sendInviteEmail(to: string, magicLink: string): Promise<void> {
  const from = process.env.MAIL_FROM ?? 'BetterBlog <noreply@betterblog.com>'
  const appName = process.env.APP_NAME ?? 'BetterBlog'

  // When no SMTP is configured (e.g. local dev), log the link instead
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    console.log(`[Invite] Magic link for ${to}: ${magicLink}`)
    return
  }

  await transporter.sendMail({
    from,
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
