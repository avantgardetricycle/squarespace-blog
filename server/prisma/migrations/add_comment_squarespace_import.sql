-- Lazy-imported Squarespace comments (reply targets)
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "external_comment_id" TEXT;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "imported_from_squarespace" BOOLEAN NOT NULL DEFAULT false;

-- Composite unique: PostgreSQL treats NULL external_comment_id as distinct, so many native BB rows (null) can coexist.
CREATE UNIQUE INDEX IF NOT EXISTS "comments_site_post_external_id"
  ON "comments" ("site_id", "post_id", "external_comment_id");
