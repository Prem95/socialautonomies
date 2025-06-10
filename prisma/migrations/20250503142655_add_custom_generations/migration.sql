-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "max_custom_generations" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "custom_generations_used" INTEGER NOT NULL DEFAULT 0;
