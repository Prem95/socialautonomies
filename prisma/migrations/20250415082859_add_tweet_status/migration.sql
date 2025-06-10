-- CreateEnum
CREATE TYPE "tweet_status" AS ENUM ('scheduled', 'posting', 'posted', 'failed');

-- AlterTable
ALTER TABLE "tweets" ADD COLUMN     "status" "tweet_status" NOT NULL DEFAULT 'posted';
