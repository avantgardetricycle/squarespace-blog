-- Move encrypted Squarespace API key from blog_comment_settings to sites.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS squarespace_api_key_enc TEXT;

UPDATE sites s
SET squarespace_api_key_enc = bcs.squarespace_api_key_enc
FROM blog_comment_settings bcs
WHERE bcs.site_id = s.id
  AND bcs.squarespace_api_key_enc IS NOT NULL
  AND (s.squarespace_api_key_enc IS NULL OR s.squarespace_api_key_enc = '');

ALTER TABLE blog_comment_settings DROP COLUMN IF EXISTS squarespace_api_key_enc;
