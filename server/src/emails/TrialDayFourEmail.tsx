import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface TrialDayFourEmailProps {
  trialEndDate?: string
  loginUrl?: string
  supportUrl?: string
  recipientName?: string | null
}

export function TrialDayFourEmail({
  trialEndDate = 'the end of your trial',
  loginUrl = '#',
  supportUrl = '#',
  recipientName = null,
}: TrialDayFourEmailProps) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : null

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
              Your free trial
            </Text>
          </Section>

          <Section style={{ padding: 40 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: '#0a0a0a', marginTop: 0, marginBottom: 16, textAlign: 'center' as const }}>
              Your free trial ends on {trialEndDate}
            </h2>

            {greeting ? (
              <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
                {greeting}
              </Text>
            ) : null}

            <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
              You're entering the fourth day of your BetterBlog free trial. Your trial ends on {trialEndDate} (UTC).
            </Text>

            <Text style={{ color: '#6b6b6b', fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
              Log in to manage your account. You can review your plan or cancel anytime before the trial ends.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Link
                href={loginUrl}
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
                Log in to manage your account
              </Link>
            </Section>

            <Text style={{ color: '#6b6b6b', fontSize: 14, lineHeight: 1.6, margin: '32px 0 0', textAlign: 'center' as const }}>
              Or copy and paste this link into your browser:
            </Text>

            <Section style={{ backgroundColor: '#f7f6f3', padding: '12px 16px', borderRadius: 6, marginTop: 12, border: '1px solid #d4d4d0' }}>
              <code style={{ color: '#0a0a0a', fontSize: 13, wordBreak: 'break-all' as const, fontFamily: "'DM Sans', monospace" }}>
                {loginUrl}
              </code>
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
      </Body>
    </Html>
  )
}
