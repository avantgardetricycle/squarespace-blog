-- When a Stripe payment first fails, this timestamp starts the 7-day render-only grace window.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "payment_failed_at" TIMESTAMP(3);
