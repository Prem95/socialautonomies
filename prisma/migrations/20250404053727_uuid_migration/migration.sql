/*
  Warnings:

  - The primary key for the `agent_workers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `agents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tweets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `worker_id` on the `agent_workers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `agent_id` on the `agent_workers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `agent_id` on the `agents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tweet_id` on the `tweets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `agent_id` on the `tweets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "agent_workers" DROP CONSTRAINT "agent_workers_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "tweets" DROP CONSTRAINT "tweets_agent_id_fkey";

-- AlterTable
ALTER TABLE "agent_workers" DROP CONSTRAINT "agent_workers_pkey",
DROP COLUMN "worker_id",
ADD COLUMN     "worker_id" UUID NOT NULL,
DROP COLUMN "agent_id",
ADD COLUMN     "agent_id" UUID NOT NULL,
ADD CONSTRAINT "agent_workers_pkey" PRIMARY KEY ("worker_id");

-- AlterTable
ALTER TABLE "agents" DROP CONSTRAINT "agents_pkey",
DROP COLUMN "agent_id",
ADD COLUMN     "agent_id" UUID NOT NULL,
ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("agent_id");

-- AlterTable
ALTER TABLE "tweets" DROP CONSTRAINT "tweets_pkey",
DROP COLUMN "tweet_id",
ADD COLUMN     "tweet_id" UUID NOT NULL,
DROP COLUMN "agent_id",
ADD COLUMN     "agent_id" UUID NOT NULL,
ADD CONSTRAINT "tweets_pkey" PRIMARY KEY ("tweet_id");

-- AddForeignKey
ALTER TABLE "agent_workers" ADD CONSTRAINT "agent_workers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;
