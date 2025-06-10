/*
  Warnings:

  - You are about to drop the column `auto_tweet_count` on the `agents` table. All the data in the column will be lost.
  - You are about to drop the column `auto_tweet_frequency_hours` on the `agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "agents" DROP COLUMN "auto_tweet_count",
DROP COLUMN "auto_tweet_frequency_hours",
ADD COLUMN     "auto_tweet_interval" TEXT;
