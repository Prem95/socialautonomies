-- CreateEnum
CREATE TYPE "agent_status" AS ENUM ('stopped', 'running');

-- CreateTable
CREATE TABLE "plans" (
    "plan_id" BIGSERIAL NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "max_agents" INTEGER NOT NULL DEFAULT 1,
    "max_tweets_per_agent" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "plan_id" BIGINT,
    "profile_created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripe_customer_id" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "agents" (
    "agent_id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "brand" JSONB,
    "special_hooks" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "example_user_question" TEXT,
    "example_agent_reply" TEXT,
    "status" "agent_status",
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("agent_id")
);

-- CreateTable
CREATE TABLE "tweets" (
    "tweet_id" BIGSERIAL NOT NULL,
    "agent_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "post_time" TIMESTAMPTZ,
    "twitter_tweet_id" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "retweets" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,

    CONSTRAINT "tweets_pkey" PRIMARY KEY ("tweet_id")
);

-- CreateTable
CREATE TABLE "cookies" (
    "cookie_id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires" TIMESTAMPTZ,
    "domain" TEXT,
    "path" TEXT,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "http_only" BOOLEAN NOT NULL DEFAULT false,
    "same_site" TEXT,

    CONSTRAINT "cookies_pkey" PRIMARY KEY ("cookie_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cookies_user_id_key_key" ON "cookies"("user_id", "key");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookies" ADD CONSTRAINT "cookies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
