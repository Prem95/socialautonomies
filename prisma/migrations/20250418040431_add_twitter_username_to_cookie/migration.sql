/*
  Warnings:

  - A unique constraint covering the columns `[user_id,twitter_username,key]` on the table `cookies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `twitter_username` to the `cookies` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "cookies_user_id_key_key";

-- AlterTable
ALTER TABLE "cookies" ADD COLUMN     "twitter_username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cookies_user_id_twitter_username_key_key" ON "cookies"("user_id", "twitter_username", "key");
