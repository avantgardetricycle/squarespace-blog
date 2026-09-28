-- Beta grants live on subscriptions without a Stripe customer. Existing rows stay stripe-backed.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'stripe';
