/**
 * Kit and Mailchimp subscribers. API keys stay on the server.
 * Fetch is injectable so tests can assert URLs and headers without the network.
 */

import { createHash } from 'crypto'

export type EmailProviderName = 'kit' | 'mailchimp'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type ProviderSuccess = { ok: true; warning?: string }
export type ProviderFailure = { ok: false; error: string }
export type ProviderResult = ProviderSuccess | ProviderFailure

const REQUEST_TIMEOUT_MS = 8000

export function mailchimpDatacenter(apiKey: string): string | null {
  const trimmed = apiKey.trim()
  const dash = trimmed.lastIndexOf('-')
  if (dash <= 0 || dash === trimmed.length - 1) return null
  const dc = trimmed.slice(dash + 1).toLowerCase()
  if (!/^[a-z]{2}\d+$/.test(dc)) return null
  return dc
}

export function mailchimpSubscriberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex')
}

export function validateDestinationId(provider: EmailProviderName, destinationId: string): string | null {
  const id = destinationId.trim()
  if (!id) return provider === 'kit' ? 'Form ID is required.' : 'Audience ID is required.'
  if (provider === 'kit' && !/^\d{1,20}$/.test(id)) return 'Kit form ID should be a number.'
  if (provider === 'mailchimp' && !/^[a-fA-F0-9]{4,32}$/.test(id)) {
    return 'Mailchimp audience ID should be the hex id from Audience settings.'
  }
  return null
}

export function redactSubscriberText(message: string): string {
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').slice(0, 300)
}

function kitHeaders(apiKey: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'X-Kit-Api-Key': apiKey,
  }
}

function mailchimpHeaders(apiKey: string): Record<string, string> {
  const token = Buffer.from(`anystring:${apiKey}`).toString('base64')
  return {
    Accept: 'application/json',
    Authorization: `Basic ${token}`,
  }
}

async function readJson(res: Response): Promise<{ text: string; json: Record<string, unknown> | null }> {
  const text = await res.text()
  if (!text) return { text, json: null }
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { text, json: parsed as Record<string, unknown> }
    }
    return { text, json: null }
  } catch {
    return { text, json: null }
  }
}

function isMemberExists(status: number, text: string, json: Record<string, unknown> | null): boolean {
  if (status !== 400) return false
  const title = typeof json?.title === 'string' ? json.title : ''
  return /member exists/i.test(title) || /member exists/i.test(text)
}

function detailFromBody(json: Record<string, unknown> | null, text: string): string {
  const title = typeof json?.title === 'string' ? json.title.trim() : ''
  const detail = typeof json?.detail === 'string' ? json.detail.trim() : ''
  const message = typeof json?.message === 'string' ? json.message.trim() : ''
  const errors = Array.isArray(json?.errors)
    ? json.errors.filter((item): item is string => typeof item === 'string').join(' ')
    : ''
  const combined = [title, detail || message || errors].filter(Boolean).join(': ')
  return redactSubscriberText(combined || text)
}

function friendlyStatus(providerLabel: 'Kit' | 'Mailchimp', status: number): string {
  if (status === 401 || status === 403) return `${providerLabel} rejected this API key.`
  if (status === 404) {
    return providerLabel === 'Kit' ? 'Kit form was not found.' : 'Mailchimp audience was not found.'
  }
  return `${providerLabel} returned an error (${status}).`
}

function networkMessage(providerLabel: 'Kit' | 'Mailchimp', err: unknown): string {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return `${providerLabel} did not respond in time.`
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return `${providerLabel} did not respond in time.`
  }
  return `Could not reach ${providerLabel}.`
}

async function providerFetch(
  fetchImpl: FetchLike,
  providerLabel: 'Kit' | 'Mailchimp',
  url: string,
  init: RequestInit
): Promise<{ res: Response; text: string; json: Record<string, unknown> | null } | ProviderFailure> {
  try {
    const res = await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await readJson(res)
    return { res, ...body }
  } catch (err) {
    return { ok: false, error: networkMessage(providerLabel, err) }
  }
}

export async function testEmailProvider(opts: {
  provider: EmailProviderName
  apiKey: string
  destinationId: string
  fetchImpl?: FetchLike
}): Promise<ProviderResult> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const destinationError = validateDestinationId(opts.provider, opts.destinationId)
  if (destinationError) return { ok: false, error: destinationError }
  const destinationId = opts.destinationId.trim()
  const apiKey = opts.apiKey.trim()
  if (!apiKey) return { ok: false, error: 'API key is required.' }

  if (opts.provider === 'mailchimp') {
    const dc = mailchimpDatacenter(apiKey)
    if (!dc) return { ok: false, error: 'Mailchimp API keys end with a datacenter suffix such as -us21.' }
    const result = await providerFetch(
      fetchImpl,
      'Mailchimp',
      `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(destinationId)}`,
      { method: 'GET', headers: mailchimpHeaders(apiKey) }
    )
    if ('ok' in result) return result
    if (!result.res.ok) return { ok: false, error: friendlyStatus('Mailchimp', result.res.status) }
    return { ok: true }
  }

  const result = await providerFetch(
    fetchImpl,
    'Kit',
    `https://api.kit.com/v4/forms/${encodeURIComponent(destinationId)}`,
    { method: 'GET', headers: kitHeaders(apiKey) }
  )
  if ('ok' in result) return result
  if (!result.res.ok) return { ok: false, error: friendlyStatus('Kit', result.res.status) }
  return { ok: true }
}

async function subscribeKitForm(
  fetchImpl: FetchLike,
  apiKey: string,
  formId: string,
  email: string
): Promise<ProviderResult> {
  const result = await providerFetch(
    fetchImpl,
    'Kit',
    `https://api.kit.com/v4/forms/${encodeURIComponent(formId)}/subscribers`,
    {
      method: 'POST',
      headers: { ...kitHeaders(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email }),
    }
  )
  if ('ok' in result) return result
  if (!result.res.ok) {
    const detail = detailFromBody(result.json, '')
    return { ok: false, error: detail || friendlyStatus('Kit', result.res.status) }
  }
  return { ok: true }
}

function tagIdFromRecord(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const id = (value as { id?: unknown }).id
  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  if (typeof id === 'string' && id.trim()) return id.trim()
  return null
}

async function findOrCreateKitTag(
  fetchImpl: FetchLike,
  apiKey: string,
  name: string
): Promise<{ id: string } | ProviderFailure> {
  const wanted = name.trim().slice(0, 100)
  if (!wanted) return { ok: false, error: 'Lead magnet title was empty.' }

  let after: string | null = null
  for (let page = 0; page < 5; page++) {
    const url = new URL('https://api.kit.com/v4/tags')
    url.searchParams.set('per_page', '500')
    if (after) url.searchParams.set('after', after)
    const listed = await providerFetch(fetchImpl, 'Kit', url.toString(), {
      method: 'GET',
      headers: kitHeaders(apiKey),
    })
    if ('ok' in listed) break
    if (!listed.res.ok) break
    const tags = Array.isArray(listed.json?.tags) ? listed.json.tags : []
    for (const tag of tags) {
      if (!tag || typeof tag !== 'object') continue
      const tagName = (tag as { name?: unknown }).name
      if (tagName === wanted) {
        const id = tagIdFromRecord(tag)
        if (id) return { id }
      }
    }
    const pagination = listed.json?.pagination
    const hasNext =
      pagination &&
      typeof pagination === 'object' &&
      (pagination as { has_next_page?: unknown }).has_next_page === true
    const cursor =
      pagination && typeof pagination === 'object'
        ? (pagination as { end_cursor?: unknown }).end_cursor
        : null
    if (!hasNext || typeof cursor !== 'string' || !cursor) break
    after = cursor
  }

  const created = await providerFetch(fetchImpl, 'Kit', 'https://api.kit.com/v4/tags', {
    method: 'POST',
    headers: { ...kitHeaders(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: wanted }),
  })
  if ('ok' in created) return created
  if (!created.res.ok) {
    const detail = detailFromBody(created.json, '')
    return { ok: false, error: detail || `Kit could not create the lead magnet tag.` }
  }
  const id = tagIdFromRecord(created.json?.tag) ?? tagIdFromRecord(created.json)
  if (!id) return { ok: false, error: 'Kit did not return a tag id.' }
  return { id }
}

async function subscribeKitTag(
  fetchImpl: FetchLike,
  apiKey: string,
  tagId: string,
  email: string
): Promise<ProviderResult> {
  const result = await providerFetch(
    fetchImpl,
    'Kit',
    `https://api.kit.com/v4/tags/${encodeURIComponent(tagId)}/subscribers`,
    {
      method: 'POST',
      headers: { ...kitHeaders(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email }),
    }
  )
  if ('ok' in result) return result
  if (!result.res.ok) {
    const detail = detailFromBody(result.json, '')
    return { ok: false, error: detail || 'Kit could not apply the lead magnet tag.' }
  }
  return { ok: true }
}

async function subscribeMailchimp(opts: {
  fetchImpl: FetchLike
  apiKey: string
  dc: string
  audienceId: string
  email: string
  leadMagnetTitle?: string | null
}): Promise<ProviderResult> {
  const hash = mailchimpSubscriberHash(opts.email)
  const memberUrl = `https://${opts.dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(opts.audienceId)}/members/${hash}`
  const result = await providerFetch(opts.fetchImpl, 'Mailchimp', memberUrl, {
    method: 'PUT',
    headers: { ...mailchimpHeaders(opts.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_address: opts.email,
      status_if_new: 'subscribed',
    }),
  })
  if ('ok' in result) return result
  if (!result.res.ok && !isMemberExists(result.res.status, result.text, result.json)) {
    const detail = detailFromBody(result.json, '')
    return { ok: false, error: detail || friendlyStatus('Mailchimp', result.res.status) }
  }

  const title = opts.leadMagnetTitle?.trim()
  if (!title) return { ok: true }

  const tagged = await providerFetch(opts.fetchImpl, 'Mailchimp', `${memberUrl}/tags`, {
    method: 'POST',
    headers: { ...mailchimpHeaders(opts.apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: [{ name: title.slice(0, 100), status: 'active' }] }),
  })
  if ('ok' in tagged) return { ok: true, warning: tagged.error }
  if (!tagged.res.ok) {
    const detail = detailFromBody(tagged.json, '')
    return {
      ok: true,
      warning: detail || 'Subscribed, but the lead magnet tag was not applied.',
    }
  }
  return { ok: true }
}

export async function forwardSubscriber(opts: {
  provider: EmailProviderName
  apiKey: string
  destinationId: string
  email: string
  leadMagnetTitle?: string | null
  fetchImpl?: FetchLike
}): Promise<ProviderResult> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const destinationError = validateDestinationId(opts.provider, opts.destinationId)
  if (destinationError) return { ok: false, error: destinationError }
  const destinationId = opts.destinationId.trim()
  const apiKey = opts.apiKey.trim()
  const email = opts.email.trim().toLowerCase()
  if (!apiKey) return { ok: false, error: 'API key is required.' }

  if (opts.provider === 'mailchimp') {
    const dc = mailchimpDatacenter(apiKey)
    if (!dc) return { ok: false, error: 'Mailchimp API keys end with a datacenter suffix such as -us21.' }
    return subscribeMailchimp({
      fetchImpl,
      apiKey,
      dc,
      audienceId: destinationId,
      email,
      leadMagnetTitle: opts.leadMagnetTitle,
    })
  }

  const subscribed = await subscribeKitForm(fetchImpl, apiKey, destinationId, email)
  if (!subscribed.ok) return subscribed

  const title = opts.leadMagnetTitle?.trim()
  if (!title) return { ok: true }

  const tag = await findOrCreateKitTag(fetchImpl, apiKey, title)
  if ('ok' in tag) {
    return { ok: true, warning: `Subscribed, but the lead magnet tag was not applied: ${tag.error}` }
  }
  const tagged = await subscribeKitTag(fetchImpl, apiKey, tag.id, email)
  if (!tagged.ok) {
    return { ok: true, warning: `Subscribed, but the lead magnet tag was not applied: ${tagged.error}` }
  }
  return { ok: true }
}
