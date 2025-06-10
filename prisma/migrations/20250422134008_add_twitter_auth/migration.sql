/*
  Warnings:

  - You are about to drop the column `twitter_username` on the `agents` table. All the data in the column will be lost.
  - You are about to drop the column `twitter_username` on the `cookies` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,key]` on the table `cookies` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "cookies_user_id_twitter_username_key_key";

-- AlterTable
ALTER TABLE "agents" DROP COLUMN "twitter_username";

-- AlterTable
ALTER TABLE "cookies" DROP COLUMN "twitter_username";

-- CreateTable
CREATE TABLE "twitter_auths" (
    "twitter_auth_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "access_token" TEXT,
    "access_secret" TEXT,
    "twitter_user_id" TEXT,
    "twitter_screen_name" TEXT,
    "temp_oauth_token" TEXT,
    "temp_oauth_token_secret" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "twitter_auths_pkey" PRIMARY KEY ("twitter_auth_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "twitter_auths_agent_id_key" ON "twitter_auths"("agent_id");

-- CreateIndex
CREATE INDEX "twitter_auths_temp_oauth_token_idx" ON "twitter_auths"("temp_oauth_token");

-- CreateIndex
CREATE UNIQUE INDEX "cookies_user_id_key_key" ON "cookies"("user_id", "key");

-- AddForeignKey
ALTER TABLE "twitter_auths" ADD CONSTRAINT "twitter_auths_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;
