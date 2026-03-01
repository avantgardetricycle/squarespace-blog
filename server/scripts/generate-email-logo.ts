/**
 * Generates email-optimized logo from logo_new.png (small size for data URI embedding).
 * Run: npx tsx scripts/generate-email-logo.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const emailsDir = join(__dirname, '../src/emails')
const clientPublic = join(__dirname, '../../client/public')
const srcPath = join(clientPublic, 'logo_new.png')
const outPath = join(emailsDir, 'logo-email.png')

const buf = readFileSync(srcPath)
const png = await sharp(buf)
  .resize(96, 96) // 48px display at 2x retina, keeps data URI small
  .png()
  .toBuffer()

writeFileSync(outPath, png)
console.log(`Generated ${outPath}`)
