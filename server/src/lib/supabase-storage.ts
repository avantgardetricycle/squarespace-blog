import { randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export const AUTHOR_PHOTOS_BUCKET = 'author-photos'
export const AUTHOR_PHOTO_MAX_BYTES = 4 * 1024 * 1024
const AVATAR_SIZE = 512
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

let client: SupabaseClient | null = null
let bucketReady: Promise<void> | null = null

export function isAllowedAuthorPhotoType(mime: string): boolean {
  return ALLOWED_TYPES.has(mime)
}

export function getSupabaseStorageClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Author photo storage is not configured')
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return client
}

export function isAuthorPhotoStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function ensureAuthorPhotosBucket(): Promise<void> {
  if (bucketReady) return bucketReady
  bucketReady = (async () => {
    const supabase = getSupabaseStorageClient()
    const { data, error } = await supabase.storage.getBucket(AUTHOR_PHOTOS_BUCKET)
    if (data && !error) return
    const { error: createError } = await supabase.storage.createBucket(AUTHOR_PHOTOS_BUCKET, {
      public: true,
      fileSizeLimit: AUTHOR_PHOTO_MAX_BYTES
    })
    if (createError && !/already exists/i.test(createError.message)) {
      bucketReady = null
      throw createError
    }
  })()
  return bucketReady
}

export async function processAuthorPhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer()
}

export function authorPhotoObjectPath(siteId: string): string {
  return `${siteId}/${randomUUID()}.webp`
}

export function getAuthorPhotoPublicUrl(path: string): string {
  const supabase = getSupabaseStorageClient()
  const { data } = supabase.storage.from(AUTHOR_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function parseAuthorPhotoPath(imageUrl: string, siteId: string): string | null {
  try {
    const url = new URL(imageUrl)
    const marker = `/object/public/${AUTHOR_PHOTOS_BUCKET}/`
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return null
    const path = decodeURIComponent(url.pathname.slice(idx + marker.length))
    if (!path || path.includes('..') || !path.startsWith(`${siteId}/`)) return null
    return path
  } catch {
    return null
  }
}

export async function uploadAuthorPhoto(siteId: string, buffer: Buffer): Promise<string> {
  await ensureAuthorPhotosBucket()
  const supabase = getSupabaseStorageClient()
  const processed = await processAuthorPhoto(buffer)
  const path = authorPhotoObjectPath(siteId)
  const { error } = await supabase.storage.from(AUTHOR_PHOTOS_BUCKET).upload(path, processed, {
    contentType: 'image/webp',
    upsert: false
  })
  if (error) throw error
  return getAuthorPhotoPublicUrl(path)
}

export async function deleteAuthorPhotoIfOwned(imageUrl: string, siteId: string): Promise<void> {
  const path = parseAuthorPhotoPath(imageUrl, siteId)
  if (!path) return
  try {
    const supabase = getSupabaseStorageClient()
    await supabase.storage.from(AUTHOR_PHOTOS_BUCKET).remove([path])
  } catch {
    // best-effort
  }
}
