/**
 * Rewrite plaintext sites.blog_password values as AES-256-GCM ciphertext.
 * Idempotent: rows that already start with enc:v1: are left alone.
 *
 * Run from server/: npm run db:encrypt-blog-passwords
 * Requires DATABASE_URL / DIRECT_URL and ENCRYPTION_KEY.
 */
import 'dotenv/config'
import prisma, { migrateBlogPasswordAtRest } from '../src/db/index.js'
import { isSealedBlogPassword } from '../src/lib/blog-password.js'

async function main (): Promise<void> {
  const sites = await prisma.site.findMany({
    where: { blogPassword: { not: null } },
    select: { id: true, blogPassword: true }
  })

  let pending = 0
  for (const site of sites) {
    if (!site.blogPassword || isSealedBlogPassword(site.blogPassword)) continue
    pending++
    await migrateBlogPasswordAtRest(site.id, site.blogPassword)
  }

  const after = await prisma.site.findMany({
    where: { blogPassword: { not: null } },
    select: { blogPassword: true }
  })
  const remaining = after.filter((site) => site.blogPassword && !isSealedBlogPassword(site.blogPassword)).length
  console.log(`Sealed ${pending - remaining} plaintext blog password(s); ${remaining} still plaintext.`)
  if (remaining > 0) process.exitCode = 1
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
