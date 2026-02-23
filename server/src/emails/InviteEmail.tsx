import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface InviteEmailProps {
  magicLink?: string
  logoDataUri?: string
}

export function InviteEmail({ magicLink = '#', logoDataUri = '' }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: '#f5f5f5', padding: '40px 20px', margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <Section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)', padding: '40px 40px 32px', textAlign: 'center' as const }}>
            <table align="center" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 16px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: 12 }}>
                    {logoDataUri ? (
                      <img src={logoDataUri} alt="" width={48} height={48} style={{ display: 'block', borderRadius: 8, border: 0 }} />
                    ) : null}
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <h1 style={{ fontFamily: "'Courier Prime', monospace", fontSize: 32, fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1 }}>
                      BetterBlog
                    </h1>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, margin: 0 }}>
              Welcome to your blogging upgrade
            </Text>
          </Section>

          <Section style={{ padding: 40 }}>
            <h2 style={{ fontFamily: "'Courier Prime', monospace", fontSize: 24, color: '#171717', marginTop: 0, marginBottom: 16 }}>
              🎉 Your subscription is active!
            </h2>

            <Text style={{ color: '#525252', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
              Thanks for subscribing to BetterBlog! We're excited to help you take your Squarespace blog to the next level with powerful customization options.
            </Text>

            <Text style={{ color: '#525252', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
              Click the button below to access your dashboard and start customizing your blog. No password needed — we'll send you a magic link whenever you need to sign in.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Link
                href={magicLink}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '14px 32px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                Get Started with BetterBlog
              </Link>
            </Section>

            <Section style={{ backgroundColor: '#f5f5f5', borderLeft: '4px solid #059669', padding: '16px 20px', marginTop: 32, borderRadius: 4 }}>
              <Text style={{ color: '#171717', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
                What's next?
              </Text>
              <ul style={{ color: '#525252', fontSize: 14, lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
                <li>Access your personalized dashboard</li>
                <li>Configure your blog settings with live preview</li>
                <li>See changes update in real-time</li>
              </ul>
            </Section>
          </Section>

          <Hr style={{ borderColor: '#e5e5e5' }} />
          <Section style={{ backgroundColor: '#f5f5f5', padding: '24px 40px' }}>
            <Text style={{ color: '#737373', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px', textAlign: 'center' as const }}>
              Need help? Reply to this email or visit our support center.
            </Text>
            <Text style={{ color: '#a3a3a3', fontSize: 12, margin: 0, textAlign: 'center' as const }}>
              © 2024 BetterBlog. All rights reserved.
            </Text>
          </Section>
        </Container>

        <Text style={{ color: '#737373', fontSize: 12, textAlign: 'center' as const, marginTop: 24, maxWidth: 600, margin: '24px auto 0' }}>
          This email was sent because a subscription was created for your email address. If you didn't sign up for BetterBlog, please contact our support team.
        </Text>
      </Body>
    </Html>
  )
}
