-- Remove yearly pricing field from plans table
ALTER TABLE "plans" DROP COLUMN IF EXISTS "stripe_price_id_yearly";

-- Remove yearly billing field from profiles table  
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "billing_period";

-- Drop indexes that are no longer needed
DROP INDEX IF EXISTS "plans_stripe_price_id_yearly_idx";
DROP INDEX IF EXISTS "plans_interval_stripe_price_id_idx";
DROP INDEX IF EXISTS "profiles_billing_period_subscription_status_idx"; 