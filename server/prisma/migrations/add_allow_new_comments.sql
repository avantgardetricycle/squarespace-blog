ALTER TABLE blog_comment_settings
  ADD COLUMN IF NOT EXISTS allow_new_comments BOOLEAN NOT NULL DEFAULT true;
