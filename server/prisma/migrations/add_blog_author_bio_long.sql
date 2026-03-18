-- Add longer bio field to blog_authors
ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "bio_long" TEXT;
