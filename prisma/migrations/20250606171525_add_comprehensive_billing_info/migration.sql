-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "billing_period" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "current_period_start" TIMESTAMPTZ(6),
ADD COLUMN     "last_usage_reset" TIMESTAMPTZ(6),
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_status" TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN     "trial_end" TIMESTAMPTZ(6),
ADD COLUMN     "trial_start" TIMESTAMPTZ(6),
ADD COLUMN     "usage_reset_day" INTEGER;

-- CreateIndex
CREATE INDEX "profiles_stripe_subscription_id_idx" ON "profiles"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "profiles_subscription_status_idx" ON "profiles"("subscription_status");

-- CreateIndex
CREATE INDEX "profiles_current_period_end_idx" ON "profiles"("current_period_end");

-- CreateIndex
CREATE INDEX "profiles_last_usage_reset_idx" ON "profiles"("last_usage_reset");
