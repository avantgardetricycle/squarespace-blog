-- CreateTable (idempotent: db:migrate re-runs every *.sql after prisma db push)
CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT,
    "post_id" TEXT,
    "post_index" INTEGER,
    "url" TEXT,
    "payload" JSONB,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_events_site_id_event_type_occurred_at_idx" ON "analytics_events"("site_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_events_site_id_post_id_occurred_at_idx" ON "analytics_events"("site_id", "post_id", "occurred_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analytics_events_site_id_visitor_id_occurred_at_idx" ON "analytics_events"("site_id", "visitor_id", "occurred_at");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "analytics_events"
    ADD CONSTRAINT "analytics_events_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
