import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface MagicLinkEmailProps {
  magicLink?: string
  supportUrl?: string
}

export function MagicLinkEmail({ magicLink = '#', supportUrl = '#' }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>
      <Body style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: '#f7f6f3', padding: '40px 20px', margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e4e0' }}>
          <Section style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #5B4FE8 50%, #8F86F0 100%)', padding: '40px 40px 32px', textAlign: 'center' as const }}>
            <table align="center" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 16px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: 12 }}>
                    <img src={'cid:logo'} alt="" width={48} height={48} style={{ display: 'block', borderRadius: 8, border: 0 }} />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1 }}>
                      BetterBlog
                    </h1>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, margin: 0 }}>
              Your secure login link
            </Text>
          </Section>

          <Section style={{ padding: 40 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: '#0a0a0a', marginTop: 0, marginBottom: 16, textAlign: 'center' as const }}>
              Sign in to BetterBlog
            </h2>

            <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px', textAlign: 'center' as const }}>
              Click the button below to securely access your BetterBlog dashboard. This link will expire in 15 minutes.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Link
                href={magicLink}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#5B4FE8',
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '14px 32px',
                  borderRadius: 9999,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(91, 79, 232, 0.3)',
                }}
              >
                Sign In to Your Dashboard
              </Link>
            </Section>

            <Text style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, margin: '32px 0 0', textAlign: 'center' as const }}>
              Or copy and paste this link into your browser:
            </Text>

            <Section style={{ backgroundColor: '#f7f6f3', padding: '12px 16px', borderRadius: 6, marginTop: 12, border: '1px solid #d4d4d0' }}>
              <code style={{ color: '#0a0a0a', fontSize: 13, wordBreak: 'break-all' as const, fontFamily: "'DM Sans', monospace" }}>
                {magicLink}
              </code>
            </Section>

            <Section style={{ backgroundColor: '#f7f6f3', borderLeft: '4px solid #5B4FE8', padding: '16px 20px', marginTop: 32, borderRadius: 4, border: '1px solid #d4d4d0' }}>
              <Text style={{ color: '#0a0a0a', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
                🔒 Security reminder
              </Text>
              <Text style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                This link is unique to you and should not be shared. It will expire in 15 minutes for your security. If you didn't request this login, you can safely ignore this email.
              </Text>
            </Section>
          </Section>

          <Hr style={{ borderColor: '#e5e4e0' }} />
          <Section style={{ backgroundColor: '#f7f6f3', padding: '24px 40px', borderTop: '1px solid #e5e4e0' }}>
            <Text style={{ color: '#6b6b6b', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px', textAlign: 'center' as const }}>
              Need help? Reply to this email or{' '}
              <Link href={supportUrl} style={{ color: '#5B4FE8', textDecoration: 'underline' }}>
                visit our support center
              </Link>
              .
            </Text>
            <Text style={{ color: '#6b6b6b', fontSize: 12, margin: 0, textAlign: 'center' as const }}>
              © {new Date().getFullYear()} BetterBlog. All rights reserved.
            </Text>
          </Section>
        </Container>

        <Text style={{ color: '#6b6b6b', fontSize: 12, textAlign: 'center' as const, marginTop: 24, maxWidth: 600, margin: '24px auto 0' }}>
          This email was sent to verify your login request for BetterBlog. If you didn't attempt to sign in, please contact our support team immediately.
        </Text>
      </Body>
    </Html>
  )
}
