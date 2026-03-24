-- Sandbox Stripe price IDs + labels (Essentials / Professional / Publication naming in stripe_price_label).
-- Run against production/staging DB when STRIPE_ENVIRONMENT=sandbox uses these prices.
-- Adjust stripe_environment if you only use 'live' on a given database.

UPDATE plans
SET
  stripe_price_id = 'price_1TEaw1FNhpDahMYtkTRXKh6q',
  stripe_price_label = 'better_blog_essentials_monthly_usd'
WHERE plan_key = 'starter' AND cadence = 'monthly' AND stripe_environment = 'sandbox';

UPDATE plans
SET
  stripe_price_id = 'price_1TEbDwFNhpDahMYtRctRNNaK',
  stripe_price_label = 'better_blog_essentials_annual_usd'
WHERE plan_key = 'starter' AND cadence = 'annual' AND stripe_environment = 'sandbox';

UPDATE plans
SET
  stripe_price_id = 'price_1TEbF1FNhpDahMYtETj6pLFZ',
  stripe_price_label = 'better_blog_professional_monthly_usd'
WHERE plan_key = 'pro' AND cadence = 'monthly' AND stripe_environment = 'sandbox';

UPDATE plans
SET
  stripe_price_id = 'price_1TEbFWFNhpDahMYtVN7ItqqY',
  stripe_price_label = 'better_blog_professional_annual_usd'
WHERE plan_key = 'pro' AND cadence = 'annual' AND stripe_environment = 'sandbox';

UPDATE plans
SET
  stripe_price_id = 'price_1TEbGEFNhpDahMYtW1NRSMNP',
  stripe_price_label = 'better_blog_publication_monthly_usd'
WHERE plan_key = 'agency' AND cadence = 'monthly' AND stripe_environment = 'sandbox';

UPDATE plans
SET
  stripe_price_id = 'price_1TEbGhFNhpDahMYt5ghEqi90',
  stripe_price_label = 'better_blog_publication_annual_usd'
WHERE plan_key = 'agency' AND cadence = 'annual' AND stripe_environment = 'sandbox';
