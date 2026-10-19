import { Html, Head, Body, Text } from '@react-email/components'
import * as React from 'react'

interface CommenterCodeEmailProps {
  code?: string
  blogName?: string
}

/** Plain code email. No links. */
export function CommenterCodeEmail({ code = '000000', blogName = 'this site' }: CommenterCodeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Georgia, serif', color: '#111111', fontSize: 16, lineHeight: 1.5 }}>
        <Text style={{ margin: '0 0 12px' }}>
          Your code is <strong>{code}</strong>. It expires in 10 minutes.
        </Text>
        <Text style={{ margin: '0 0 12px' }}>Enter it on {blogName} to post your comment.</Text>
        <Text style={{ margin: 0 }}>If you didn't ask for this, you can ignore this email.</Text>
      </Body>
    </Html>
  )
}
