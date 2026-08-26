-- CreateTable (idempotent: db:migrate re-runs every *.sql after prisma db push)
CREATE TABLE IF NOT EXISTS "site_google_analytics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "measurement_id" TEXT NOT NULL,
    "api_secret" TEXT,
    "metrics_enabled" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_google_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_google_analytics_site_id_key" ON "site_google_analytics"("site_id");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "site_google_analytics"
    ADD CONSTRAINT "site_google_analytics_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
