import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface MagicLinkEmailProps {
  magicLink?: string
  logoDataUri?: string
}

export function MagicLinkEmail({ magicLink = '#', logoDataUri = '' }: MagicLinkEmailProps) {
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
              Your secure login link
            </Text>
          </Section>

          <Section style={{ padding: 40 }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#f0fdf4',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 32 }}>🔒</span>
              </div>
            </div>

            <h2 style={{ fontFamily: "'Courier Prime', monospace", fontSize: 24, color: '#171717', marginTop: 0, marginBottom: 16, textAlign: 'center' as const }}>
              Sign in to BetterBlog
            </h2>

            <Text style={{ color: '#525252', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px', textAlign: 'center' as const }}>
              Click the button below to securely access your BetterBlog dashboard. This link will expire in 15 minutes.
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
                Sign In to Your Dashboard
              </Link>
            </Section>

            <Text style={{ color: '#737373', fontSize: 14, lineHeight: 1.6, margin: '32px 0 0', textAlign: 'center' as const }}>
              Or copy and paste this link into your browser:
            </Text>

            <Section style={{ backgroundColor: '#f5f5f5', padding: '12px 16px', borderRadius: 6, marginTop: 12, border: '1px solid #e5e5e5' }}>
              <code style={{ color: '#525252', fontSize: 13, wordBreak: 'break-all' as const, fontFamily: "'Courier Prime', monospace" }}>
                {magicLink}
              </code>
            </Section>

            <Section style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '16px 20px', marginTop: 32, borderRadius: 4 }}>
              <Text style={{ color: '#171717', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
                🔒 Security reminder
              </Text>
              <Text style={{ color: '#525252', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                This link is unique to you and should not be shared. It will expire in 15 minutes for your security. If you didn't request this login, you can safely ignore this email.
              </Text>
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
          This email was sent to verify your login request for BetterBlog. If you didn't attempt to sign in, please contact our support team immediately.
        </Text>
      </Body>
    </Html>
  )
}
