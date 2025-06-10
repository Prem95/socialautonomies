/*
  Warnings:

  - The `status` column on the `agent_workers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "worker_status" AS ENUM ('INITIALIZING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR');

-- AlterTable
ALTER TABLE "agent_workers" DROP COLUMN "status",
ADD COLUMN     "status" "worker_status" NOT NULL DEFAULT 'INITIALIZING';

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "twitter_username" TEXT;

-- CreateIndex
CREATE INDEX "agent_workers_agent_id_status_idx" ON "agent_workers"("agent_id", "status");

-- CreateIndex
CREATE INDEX "agent_workers_last_heartbeat_idx" ON "agent_workers"("last_heartbeat");

-- CreateIndex
CREATE INDEX "agents_user_id_status_idx" ON "agents"("user_id", "status");

-- CreateIndex
CREATE INDEX "tweets_agent_id_idx" ON "tweets"("agent_id");
