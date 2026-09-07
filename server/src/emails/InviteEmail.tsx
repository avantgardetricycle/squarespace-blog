import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface InviteEmailProps {
  magicLink?: string
  supportUrl?: string
}

export function InviteEmail({ magicLink = '#', supportUrl = '#' }: InviteEmailProps) {
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
              Welcome to your blogging upgrade
            </Text>
          </Section>

          <Section style={{ padding: 40 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: '#0a0a0a', marginTop: 0, marginBottom: 16 }}>
              🎉 Your subscription is active!
            </h2>

            <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
              Thanks for subscribing to BetterBlog! We're excited to help you take your Squarespace blog to the next level with powerful customization options.
            </Text>

            <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px' }}>
              Click the button below to access your dashboard and start customizing your blog. No password needed — we'll send you a magic link whenever you need to sign in.
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
                Get Started with BetterBlog
              </Link>
            </Section>

            <Section style={{ backgroundColor: '#f7f6f3', borderLeft: '4px solid #5B4FE8', padding: '16px 20px', marginTop: 32, borderRadius: 4, border: '1px solid #d4d4d0' }}>
              <Text style={{ color: '#0a0a0a', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
                What's next?
              </Text>
              <ul style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
                <li>Access your personalized dashboard</li>
                <li>Configure your blog settings with live preview</li>
                <li>See changes update in real-time</li>
              </ul>
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
          This email was sent because a subscription was created for your email address. If you didn't sign up for BetterBlog, please contact our support team.
        </Text>
      </Body>
    </Html>
  )
}
