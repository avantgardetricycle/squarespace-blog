import { randomUUID } from 'crypto'
import { getSupabaseStorageClient, isAuthorPhotoStorageConfigured } from './supabase-storage.js'

export const SUPPORT_SCREENSHOTS_BUCKET = 'support-screenshots'
export const SUPPORT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif'])

let bucketReady: Promise<void> | null = null

export function isSupportScreenshotStorageConfigured(): boolean {
  return isAuthorPhotoStorageConfigured()
}

export function isAllowedSupportScreenshotType(mime: string): boolean {
  return ALLOWED_TYPES.has(mime.toLowerCase())
}

export function detectImageMimeFromMagicBytes(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif'
  }
  return null
}

async function ensureSupportScreenshotsBucket(): Promise<void> {
  if (bucketReady) return bucketReady
  bucketReady = (async () => {
    const supabase = getSupabaseStorageClient()
    const { data, error } = await supabase.storage.getBucket(SUPPORT_SCREENSHOTS_BUCKET)
    if (data && !error) return
    const { error: createError } = await supabase.storage.createBucket(SUPPORT_SCREENSHOTS_BUCKET, {
      public: false,
      fileSizeLimit: SUPPORT_SCREENSHOT_MAX_BYTES,
    })
    if (createError && !/already exists/i.test(createError.message)) {
      bucketReady = null
      throw createError
    }
  })()
  return bucketReady
}

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export async function uploadSupportScreenshot(
  userId: number,
  buffer: Buffer,
  mime: string
): Promise<string> {
  await ensureSupportScreenshotsBucket()
  const supabase = getSupabaseStorageClient()
  const path = `${userId}/${randomUUID()}.${extensionForMime(mime)}`
  const { error } = await supabase.storage.from(SUPPORT_SCREENSHOTS_BUCKET).upload(path, buffer, {
    contentType: mime === 'image/jpg' ? 'image/jpeg' : mime,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function getSupportScreenshotSignedUrl(objectPath: string): Promise<string | null> {
  if (!objectPath || objectPath.includes('..')) return null
  const supabase = getSupabaseStorageClient()
  const { data, error } = await supabase.storage
    .from(SUPPORT_SCREENSHOTS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
