/**
 * HTML template matching emails/InviteEmail.tsx design.
 * Used for SendGrid transactional emails with magic link.
 */
export function getInviteEmailHtml(magicLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #059669 100%); padding: 40px 40px 32px; text-align: center;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
        <span style="color: #ffffff; font-size: 32px;">✨</span>
        <h1 style="font-family: 'Courier Prime', monospace; font-size: 32px; font-weight: 700; color: #ffffff; margin: 0; line-height: 1;">BetterBlog</h1>
      </div>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Welcome to your blogging upgrade</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="font-family: 'Courier Prime', monospace; font-size: 24px; color: #171717; margin-top: 0; margin-bottom: 16px;">🎉 Your subscription is active!</h2>
      <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Thanks for subscribing to BetterBlog! We're excited to help you take your Squarespace blog to the next level with powerful customization options.</p>
      <p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">Click the button below to access your dashboard and start customizing your blog. No password needed — we'll send you a magic link whenever you need to sign in.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #059669 100%); color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Get Started with BetterBlog</a>
      </div>
      <div style="background-color: #f5f5f5; border-left: 4px solid #059669; padding: 16px 20px; margin-top: 32px; border-radius: 4px;">
        <p style="color: #171717; font-size: 14px; font-weight: 600; margin: 0 0 8px;">What's next?</p>
        <ul style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Access your personalized dashboard</li>
          <li>Configure your blog settings with live preview</li>
          <li>See changes update in real-time</li>
        </ul>
      </div>
    </div>
    <div style="background-color: #f5f5f5; padding: 24px 40px; border-top: 1px solid #e5e5e5;">
      <p style="color: #737373; font-size: 13px; line-height: 1.6; margin: 0 0 8px; text-align: center;">Need help? Reply to this email or visit our support center.</p>
      <p style="color: #a3a3a3; font-size: 12px; margin: 0; text-align: center;">© 2024 BetterBlog. All rights reserved.</p>
    </div>
  </div>
  <p style="color: #737373; font-size: 12px; text-align: center; margin-top: 24px; max-width: 600px; margin-left: auto; margin-right: auto;">This email was sent because a subscription was created for your email address. If you didn't sign up for BetterBlog, please contact our support team.</p>
</body>
</html>
`.trim()
}
