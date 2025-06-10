-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "auto_reply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_daily_replies" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "max_daily_tweets" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "schedule" JSONB;

-- CreateTable
CREATE TABLE "agent_workers" (
    "worker_id" BIGSERIAL NOT NULL,
    "agent_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'initializing',
    "last_heartbeat" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL,
    "stopped_at" TIMESTAMPTZ,
    "config" JSONB,
    "error" TEXT,

    CONSTRAINT "agent_workers_pkey" PRIMARY KEY ("worker_id")
);

-- AddForeignKey
ALTER TABLE "agent_workers" ADD CONSTRAINT "agent_workers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE RESTRICT ON UPDATE CASCADE;
