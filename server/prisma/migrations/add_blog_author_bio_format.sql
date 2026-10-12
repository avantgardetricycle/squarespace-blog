-- Author bios default to plain text so existing rows are not reinterpreted as Markdown.
DO $$ BEGIN
  CREATE TYPE "BioFormat" AS ENUM ('text', 'markdown', 'html');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "blog_authors" ADD COLUMN IF NOT EXISTS "bio_format" "BioFormat" NOT NULL DEFAULT 'text';
