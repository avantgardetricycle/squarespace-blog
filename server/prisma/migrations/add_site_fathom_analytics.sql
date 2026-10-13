-- CreateTable (idempotent: db:migrate re-runs every *.sql after prisma db push)
CREATE TABLE IF NOT EXISTS "site_fathom_analytics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "fathom_site_id" TEXT NOT NULL,
    "metrics_enabled" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_fathom_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_fathom_analytics_site_id_key" ON "site_fathom_analytics"("site_id");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "site_fathom_analytics"
    ADD CONSTRAINT "site_fathom_analytics_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
