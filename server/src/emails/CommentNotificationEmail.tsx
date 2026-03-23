import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

interface CommentNotificationEmailProps {
  displayName: string
  postTitle: string
  commentExcerpt: string
  approveUrl: string
  viewUrl: string
  spamUrl: string
}

export function CommentNotificationEmail({
  displayName = 'A reader',
  postTitle = 'Untitled',
  commentExcerpt = '',
  approveUrl = '#',
  viewUrl = '#',
  spamUrl = '#',
}: CommentNotificationEmailProps) {
  return (
    <Html>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>
      <Body style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: '#f7f6f3', padding: '40px 20px', margin: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e4e0' }}>
          <Section style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #5B4FE8 50%, #8F86F0 100%)', padding: '32px 40px', textAlign: 'center' as const }}>
            <Text style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              New Comment
            </Text>
          </Section>

          <Section style={{ padding: 32 }}>
            <Text style={{ color: '#0a0a0a', fontSize: 16, margin: '0 0 16px', lineHeight: 1.6 }}>
              <strong>{displayName}</strong> commented on your post <strong>&quot;{postTitle}&quot;</strong>:
            </Text>

            <Section style={{ backgroundColor: '#f7f6f3', padding: '16px 20px', borderRadius: 8, border: '1px solid #e5e4e0', marginBottom: 24 }}>
              <Text style={{ color: '#6b6b6b', fontSize: 15, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                &quot;{commentExcerpt}&quot;
              </Text>
            </Section>

            <Section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <Link
                href={approveUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Approve Comment
              </Link>
              <Link
                href={viewUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#5B4FE8',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                View in Dashboard
              </Link>
              <Link
                href={spamUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#6b6b6b',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Mark as Spam
              </Link>
            </Section>

            <Hr style={{ borderColor: '#e5e4e0' }} />
            <Text style={{ color: '#6b6b6b', fontSize: 12, margin: '16px 0 0' }}>
              Manage your notification preferences in BetterBlog Settings.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
