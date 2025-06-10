-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "auto_tweet_count" INTEGER,
ADD COLUMN     "auto_tweet_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_tweet_frequency_hours" INTEGER,
ADD COLUMN     "last_auto_tweet_time" TIMESTAMPTZ;
