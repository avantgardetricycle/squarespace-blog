-- Move encrypted Squarespace API key from blog_comment_settings to sites.
-- Idempotent: prisma db push already matches the current schema, so this column
-- is often already gone when db:migrate re-runs every *.sql file.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS squarespace_api_key_enc TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blog_comment_settings'
      AND column_name = 'squarespace_api_key_enc'
  ) THEN
    UPDATE sites s
    SET squarespace_api_key_enc = bcs.squarespace_api_key_enc
    FROM blog_comment_settings bcs
    WHERE bcs.site_id = s.id
      AND bcs.squarespace_api_key_enc IS NOT NULL
      AND (s.squarespace_api_key_enc IS NULL OR s.squarespace_api_key_enc = '');
  END IF;
END $$;

ALTER TABLE blog_comment_settings DROP COLUMN IF EXISTS squarespace_api_key_enc;
