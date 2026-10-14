-- Marks the day-4 trial reminder so a cron retry does not send it twice.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_day_four_email_sent_at" TIMESTAMP(3);
