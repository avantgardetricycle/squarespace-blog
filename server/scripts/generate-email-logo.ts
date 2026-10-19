/**
 * Generates the small square logos from the purple pen (client/public/logo-pen.svg):
 *  - src/emails/logo-email.png: 96x96, transparent, for the inline email logo (48px at 2x)
 *  - client/public/apple-touch-icon.png: 180x180 on white (iOS fills transparency with black)
 * Run: npx tsx scripts/generate-email-logo.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const emailsDir = join(__dirname, '../src/emails')
const clientPublic = join(__dirname, '../../client/public')
const pen = readFileSync(join(clientPublic, 'logo-pen.svg'))

async function square (size: number, penHeight: number, background: sharp.Color, outPath: string) {
  const mark = await sharp(pen, { density: 600 }).resize({ height: penHeight }).png().toBuffer()
  const png = await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
  writeFileSync(outPath, png)
  console.log(`Generated ${outPath}`)
}

await square(96, 84, { r: 0, g: 0, b: 0, alpha: 0 }, join(emailsDir, 'logo-email.png'))
await square(180, 140, { r: 255, g: 255, b: 255, alpha: 1 }, join(clientPublic, 'apple-touch-icon.png'))
