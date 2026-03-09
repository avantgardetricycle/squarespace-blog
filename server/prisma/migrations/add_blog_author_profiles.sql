-- Add profile fields to blog_authors
ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "social_links" JSONB;
