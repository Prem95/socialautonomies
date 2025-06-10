-- Plans table with limits
CREATE TABLE plans (
    plan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL,
    interval TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    max_agents INTEGER NOT NULL DEFAULT 1,
    max_tweets_per_agent INTEGER NOT NULL DEFAULT 10
);

-- Profiles table (links to Supabase Auth)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    plan_id BIGINT REFERENCES plans(plan_id),
    profile_created_at TIMESTAMPTZ DEFAULT NOW(),
    stripe_customer_id TEXT
);

-- ENUM for agent status
CREATE TYPE agent_status AS ENUM ('stopped', 'running');

-- Agents table with character data
CREATE TABLE agents (
    agent_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    brand JSONB,
    special_hooks JSONB,
    language TEXT DEFAULT 'en-US',
    example_user_question TEXT,
    example_agent_reply TEXT,
    status agent_status,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
);

-- Tweets table with metrics
CREATE TABLE tweets (
    tweet_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(agent_id),
    text TEXT NOT NULL,
    post_time TIMESTAMPTZ,
    twitter_tweet_id TEXT,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    url TEXT
);

-- Cookies table with unique constraint
CREATE TABLE cookies (
    cookie_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(user_id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    expires TIMESTAMPTZ,
    domain TEXT,
    path TEXT,
    secure BOOLEAN DEFAULT FALSE,
    http_only BOOLEAN DEFAULT FALSE,
    same_site TEXT,
    UNIQUE (user_id, key)
);