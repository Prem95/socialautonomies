/*
  Warnings:

  - A unique constraint covering the columns `[twitter_tweet_id]` on the table `tweets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tweets" ADD COLUMN     "context" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tweets_twitter_tweet_id_key" ON "tweets"("twitter_tweet_id");
