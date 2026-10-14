-- Ciphertext (enc:v1: + AES-256-GCM) is longer than a short password.
ALTER TABLE sites ALTER COLUMN blog_password TYPE TEXT;
