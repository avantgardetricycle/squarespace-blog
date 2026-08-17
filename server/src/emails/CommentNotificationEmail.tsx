import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components'
import * as React from 'react'

export type CommentNotificationCommentStatus = 'pending' | 'approved'

interface CommentNotificationEmailProps {
  displayName: string
  postTitle: string
  commentExcerpt: string
  viewUrl: string
  commentSettingsUrl: string
  commentStatus: CommentNotificationCommentStatus
  approveUrl: string
  spamUrl: string
  hideUrl: string
}

const cellStyle: React.CSSProperties = {
  width: '33.33%',
  padding: '0 6px 10px 6px',
  verticalAlign: 'top',
}

const linkBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 14,
  fontWeight: 600,
  padding: '12px 16px',
  borderRadius: 6,
  textDecoration: 'none',
  textAlign: 'center' as const,
}

export function CommentNotificationEmail({
  displayName = 'A reader',
  postTitle = 'Untitled',
  commentExcerpt = '',
  viewUrl = '#',
  commentSettingsUrl = '#',
  commentStatus = 'pending',
  approveUrl = '#',
  spamUrl = '#',
  hideUrl = '#',
}: CommentNotificationEmailProps) {
  const isPending = commentStatus === 'pending'
  const helperText = isPending
    ? 'This comment is awaiting review. Approve it, mark it as spam, or open it in the dashboard.'
    : 'This comment is published. Mark it as spam, hide it, or view it in the dashboard.'

  const firstHref = isPending ? approveUrl : spamUrl
  const firstLabel = isPending ? 'Approve' : 'Mark as spam'
  const firstStyle: React.CSSProperties = isPending
    ? { ...linkBase, backgroundColor: '#059669', color: '#ffffff' }
    : { ...linkBase, backgroundColor: '#ffffff', color: '#b91c1c', border: '1px solid #fecaca' }

  const secondHref = isPending ? spamUrl : hideUrl
  const secondLabel = isPending ? 'Mark as spam' : 'Hide'
  const secondStyle: React.CSSProperties = isPending
    ? { ...linkBase, backgroundColor: '#ffffff', color: '#b91c1c', border: '1px solid #fecaca' }
    : { ...linkBase, backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db' }

  const viewStyle: React.CSSProperties = {
    ...linkBase,
    backgroundColor: '#5B4FE8',
    color: '#ffffff',
  }

  const settingsStyle: React.CSSProperties = {
    ...linkBase,
    backgroundColor: '#ffffff',
    color: '#5B4FE8',
    border: '1px solid #5B4FE8',
  }

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

            <Text style={{ color: '#6b6b6b', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
              {helperText}
            </Text>

            <Section style={{ marginBottom: 16 }}>
              <table
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                width="100%"
                style={{ borderCollapse: 'collapse' as const, tableLayout: 'fixed' as const }}
              >
                <tbody>
                  <tr>
                    <td style={cellStyle}>
                      <Link href={firstHref} style={firstStyle}>
                        {firstLabel}
                      </Link>
                    </td>
                    <td style={cellStyle}>
                      <Link href={secondHref} style={secondStyle}>
                        {secondLabel}
                      </Link>
                    </td>
                    <td style={cellStyle}>
                      <Link href={viewUrl} style={viewStyle}>
                        View in Dashboard
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={{ marginBottom: 16 }}>
              <Link href={commentSettingsUrl} style={settingsStyle}>
                Comment Settings
              </Link>
            </Section>

            <Hr style={{ borderColor: '#e5e4e0' }} />
            <Text style={{ color: '#6b6b6b', fontSize: 12, margin: '16px 0 0' }}>
              Manage notification preferences in{' '}
              <Link href={commentSettingsUrl} style={{ color: '#5B4FE8', textDecoration: 'underline' }}>
                Comment Settings
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
