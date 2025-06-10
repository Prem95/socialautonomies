/*
  Warnings:

  - Made the column `status` on table `agents` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "agent_status" ADD VALUE 'error';

-- DropForeignKey
ALTER TABLE "agent_workers" DROP CONSTRAINT "agent_workers_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cookies" DROP CONSTRAINT "cookies_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tweets" DROP CONSTRAINT "tweets_agent_id_fkey";

-- AlterTable
ALTER TABLE "agent_workers" ALTER COLUMN "started_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'stopped';

-- CreateIndex
CREATE INDEX "tweets_twitter_tweet_id_idx" ON "tweets"("twitter_tweet_id");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_workers" ADD CONSTRAINT "agent_workers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookies" ADD CONSTRAINT "cookies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
