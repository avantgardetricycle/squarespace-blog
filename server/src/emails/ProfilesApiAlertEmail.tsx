import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface ProfilesApiAlertEmailProps {
  siteName?: string
  siteUrl?: string | null
  siteKey?: string
  status?: number | null
  reason?: string
  errorBodySnippet?: string | null
  emailDomain?: string | null
  emailHasPlus?: boolean
  commentSettingsUrl?: string
}

export function ProfilesApiAlertEmail({
  siteName = 'a BetterBlog site',
  siteUrl = null,
  siteKey = '',
  status = null,
  reason = 'profiles_http_error',
  errorBodySnippet = null,
  emailDomain = null,
  emailHasPlus = false,
  commentSettingsUrl = '#',
}: ProfilesApiAlertEmailProps) {
  const statusLabel = status != null ? String(status) : 'n/a'
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
              Squarespace Profiles API alert
            </Text>
          </Section>

          <Section style={{ padding: 32 }}>
            <Text style={{ color: '#0a0a0a', fontSize: 16, margin: '0 0 16px', lineHeight: 1.6 }}>
              Member verification failed for <strong>{siteName}</strong>
              {siteUrl ? (
                <>
                  {' '}
                  (<Link href={siteUrl} style={{ color: '#5B4FE8' }}>{siteUrl}</Link>)
                </>
              ) : null}
              . The comment was still saved as Anonymous. Readers were not shown this error.
            </Text>

            <Section style={{ backgroundColor: '#f7f6f3', padding: '16px 20px', borderRadius: 8, border: '1px solid #e5e4e0', marginBottom: 24 }}>
              <Text style={{ color: '#6b6b6b', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                <strong>Reason:</strong> {reason}
              </Text>
              <Text style={{ color: '#6b6b6b', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                <strong>HTTP status:</strong> {statusLabel}
              </Text>
              <Text style={{ color: '#6b6b6b', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                <strong>Site key:</strong> {siteKey || 'n/a'}
              </Text>
              <Text style={{ color: '#6b6b6b', fontSize: 14, margin: '0 0 8px', lineHeight: 1.6 }}>
                <strong>Reader email domain:</strong> {emailDomain || 'n/a'}
                {emailHasPlus ? ' (plus-alias)' : ''}
              </Text>
              {errorBodySnippet ? (
                <Text style={{ color: '#6b6b6b', fontSize: 13, margin: '8px 0 0', lineHeight: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {errorBodySnippet}
                </Text>
              ) : null}
            </Section>

            <Text style={{ color: '#6b6b6b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              A 401 usually means the stored Squarespace API key was rejected (revoked, rotated, or missing Profiles permission). Re-verify the key in Comment Settings. This alert is throttled to at most once per 6 hours per site.
            </Text>

            <Section style={{ marginBottom: 16, textAlign: 'center' as const }}>
              <Link
                href={commentSettingsUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#5B4FE8',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Open Comment Settings
              </Link>
            </Section>

            <Hr style={{ borderColor: '#e5e4e0' }} />
            <Text style={{ color: '#6b6b6b', fontSize: 12, margin: '16px 0 0' }}>
              This message is for operators. Commenters are not notified when verification fails.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
