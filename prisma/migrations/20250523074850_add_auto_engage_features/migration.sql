-- CreateEnum
CREATE TYPE "reply_status" AS ENUM ('pending', 'posting', 'posted', 'failed', 'rejected');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "auto_engage_auto_reply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_engage_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_engage_frequency_hours" INTEGER,
ADD COLUMN     "auto_engage_max_replies" INTEGER,
ADD COLUMN     "auto_engage_min_score" INTEGER,
ADD COLUMN     "last_auto_engage_time" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "replies" (
    "reply_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "original_tweet_id" TEXT NOT NULL,
    "original_tweet_text" TEXT NOT NULL,
    "original_tweet_user" TEXT NOT NULL,
    "reply_text" TEXT NOT NULL,
    "status" "reply_status" NOT NULL DEFAULT 'pending',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scheduled_time" TIMESTAMPTZ(6),
    "posted_time" TIMESTAMPTZ(6),
    "twitter_reply_id" TEXT,
    "confidence" DOUBLE PRECISION DEFAULT 0.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("reply_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "replies_twitter_reply_id_key" ON "replies"("twitter_reply_id");

-- CreateIndex
CREATE INDEX "replies_agent_id_status_idx" ON "replies"("agent_id", "status");

-- CreateIndex
CREATE INDEX "replies_original_tweet_id_idx" ON "replies"("original_tweet_id");

-- CreateIndex
CREATE INDEX "replies_scheduled_time_idx" ON "replies"("scheduled_time");

-- CreateIndex
CREATE UNIQUE INDEX "replies_agent_id_original_tweet_id_key" ON "replies"("agent_id", "original_tweet_id");

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;
