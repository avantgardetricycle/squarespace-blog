-- Soft-delete for sites: hide from dashboard / public config while preserving row + relations for restore.
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "sites_user_id_deleted_at_idx" ON "sites" ("user_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "sites_user_id_url_deleted_at_idx" ON "sites" ("user_id", "url", "deleted_at");
