/*
  Warnings:

  - You are about to drop the column `auto_tweet_interval` on the `agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "agents" DROP COLUMN "auto_tweet_interval",
ADD COLUMN     "auto_tweet_frequency_hours" INTEGER;
