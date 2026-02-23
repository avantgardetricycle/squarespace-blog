/**
 * Converts logo.svg to logo.png for email embedding.
 * Run: npx tsx scripts/generate-email-logo.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const emailsDir = join(__dirname, '../src/emails')
const svgPath = join(emailsDir, 'logo.svg')
const pngPath = join(emailsDir, 'logo.png')

const svg = readFileSync(svgPath)
const png = await sharp(svg)
  .resize(96, 96) // 2x for retina
  .png()
  .toBuffer()

writeFileSync(pngPath, png)
console.log(`Generated ${pngPath}`)
