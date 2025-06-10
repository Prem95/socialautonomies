-- DropIndex
DROP INDEX "idx_profiles_tweets_used";

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "auto_engage_quality_filter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "auto_engage_strictness_level" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "idx_agents_auto_tweet_lookup" ON "agents"("status", "auto_tweet_enabled", "auto_tweet_frequency_hours");

-- CreateIndex
CREATE INDEX "idx_agents_auto_engage_lookup" ON "agents"("status", "auto_engage_enabled", "auto_engage_frequency_hours");

-- CreateIndex
CREATE INDEX "idx_agents_last_auto_tweet_time" ON "agents"("last_auto_tweet_time");

-- CreateIndex
CREATE INDEX "idx_agents_last_auto_engage_time" ON "agents"("last_auto_engage_time");

-- CreateIndex
CREATE INDEX "idx_agents_auto_tweet_timing" ON "agents"("auto_tweet_enabled", "last_auto_tweet_time");

-- CreateIndex
CREATE INDEX "idx_agents_auto_engage_timing" ON "agents"("auto_engage_enabled", "last_auto_engage_time");

-- CreateIndex
CREATE INDEX "idx_cookies_user_expires" ON "cookies"("user_id", "expires");

-- CreateIndex
CREATE INDEX "idx_cookies_expires" ON "cookies"("expires");

-- CreateIndex
CREATE INDEX "idx_replies_agent_tweet_status" ON "replies"("agent_id", "original_tweet_id", "status");

-- CreateIndex
CREATE INDEX "idx_tweets_scheduled_lookup" ON "tweets"("status", "post_time");

-- CreateIndex
CREATE INDEX "idx_tweets_status" ON "tweets"("status");

-- CreateIndex
CREATE INDEX "idx_tweets_agent_status" ON "tweets"("agent_id", "status");
