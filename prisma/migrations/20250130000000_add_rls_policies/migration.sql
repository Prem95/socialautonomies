/*
  # Comprehensive Row Level Security Setup
  
  1. Enable RLS on all tables
  2. Create policies using auth.uid() for user access control
  3. Ensure users only access their own data and related records
  4. Create helper functions for privileged actions
*/

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

-- Core user tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;

-- Agent related tables  
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_workers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "twitter_auths" ENABLE ROW LEVEL SECURITY;

-- Content tables
ALTER TABLE "tweets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "replies" ENABLE ROW LEVEL SECURITY;

-- Support tables
ALTER TABLE "cookies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their own profile" ON "profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "profiles";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "profiles";

CREATE POLICY "Users can read their own profile"
  ON "profiles" FOR SELECT
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own profile"
  ON "profiles" FOR UPDATE
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can insert their own profile"
  ON "profiles" FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

-- ============================================================================
-- PLANS TABLE POLICIES (READ-ONLY FOR ALL AUTHENTICATED USERS)
-- ============================================================================

CREATE POLICY "Authenticated users can read plans"
  ON "plans" FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- AGENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their own agents"
  ON "agents" FOR SELECT
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can insert their own agents"
  ON "agents" FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own agents"
  ON "agents" FOR UPDATE
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their own agents"
  ON "agents" FOR DELETE
  USING (auth.uid() = user_id::uuid);

-- ============================================================================
-- AGENT_WORKERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their agent workers"
  ON "agent_workers" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = agent_workers.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can insert their agent workers"
  ON "agent_workers" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = agent_workers.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can update their agent workers"
  ON "agent_workers" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = agent_workers.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can delete their agent workers"
  ON "agent_workers" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = agent_workers.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

-- ============================================================================
-- TWITTER_AUTHS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their twitter auths"
  ON "twitter_auths" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = twitter_auths.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can insert their twitter auths"
  ON "twitter_auths" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = twitter_auths.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can update their twitter auths"
  ON "twitter_auths" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = twitter_auths.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can delete their twitter auths"
  ON "twitter_auths" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = twitter_auths.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

-- ============================================================================
-- TWEETS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their tweets"
  ON "tweets" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = tweets.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can insert their tweets"
  ON "tweets" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = tweets.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can update their tweets"
  ON "tweets" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = tweets.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tweets"
  ON "tweets" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = tweets.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

-- ============================================================================
-- REPLIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their replies"
  ON "replies" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = replies.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can insert their replies"
  ON "replies" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = replies.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can update their replies"
  ON "replies" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = replies.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can delete their replies"
  ON "replies" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "agents" 
      WHERE agents.agent_id = replies.agent_id 
      AND agents.user_id::uuid = auth.uid()
    )
  );

-- ============================================================================
-- COOKIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read their own cookies"
  ON "cookies" FOR SELECT
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can insert their own cookies"
  ON "cookies" FOR INSERT
  WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own cookies"
  ON "cookies" FOR UPDATE
  USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their own cookies"
  ON "cookies" FOR DELETE
  USING (auth.uid() = user_id::uuid);

-- ============================================================================
-- WAITLIST TABLE POLICIES (NO USER ACCESS - ADMIN ONLY)
-- ============================================================================

-- Waitlist should not be accessible to regular users
-- Only service role or specific admin functions should access this

-- ============================================================================
-- HELPER FUNCTIONS FOR PRIVILEGED ACTIONS
-- ============================================================================

-- Function to get user's plan details (with usage stats)
CREATE OR REPLACE FUNCTION get_user_plan_with_usage(user_uuid TEXT DEFAULT auth.uid()::text)
RETURNS TABLE (
  plan_name TEXT,
  max_agents INTEGER,
  max_tweets_per_agent INTEGER,
  max_custom_generations INTEGER,
  current_agents_count BIGINT,
  custom_generations_used INTEGER,
  tweets_used INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user matches the requested user (unless service role)
  IF auth.uid()::text != user_uuid AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.plan_name,
    p.max_agents,
    p.max_tweets_per_agent,
    p.max_custom_generations,
    COALESCE(agent_count.count, 0) as current_agents_count,
    pr.custom_generations_used,
    pr.tweets_used
  FROM "profiles" pr
  LEFT JOIN "plans" p ON pr.plan_id = p.plan_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM "agents" 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) agent_count ON agent_count.user_id = pr.user_id
  WHERE pr.user_id = user_uuid;
END;
$$;

-- Function to safely increment custom generations usage
CREATE OR REPLACE FUNCTION increment_custom_generations(user_uuid TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Verify the requesting user matches the requested user (unless service role)
  IF auth.uid()::text != user_uuid AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get current usage and limits
  SELECT 
    pr.custom_generations_used,
    COALESCE(p.max_custom_generations, 0)
  INTO current_usage, max_allowed
  FROM "profiles" pr
  LEFT JOIN "plans" p ON pr.plan_id = p.plan_id
  WHERE pr.user_id = user_uuid;

  -- Check if under limit
  IF current_usage >= max_allowed THEN
    RETURN FALSE;
  END IF;

  -- Increment usage
  UPDATE "profiles" 
  SET custom_generations_used = custom_generations_used + 1
  WHERE user_id = user_uuid;

  RETURN TRUE;
END;
$$;

-- Function to safely increment tweets usage
CREATE OR REPLACE FUNCTION increment_tweets_used(user_uuid TEXT DEFAULT auth.uid()::text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Verify the requesting user matches the requested user (unless service role)
  IF auth.uid()::text != user_uuid AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get current usage and limits
  SELECT 
    pr.tweets_used,
    COALESCE(p.max_tweets_per_agent, 0)
  INTO current_usage, max_allowed
  FROM "profiles" pr
  LEFT JOIN "plans" p ON pr.plan_id = p.plan_id
  WHERE pr.user_id = user_uuid;

  -- Check if under limit
  IF current_usage >= max_allowed THEN
    RETURN FALSE;
  END IF;

  -- Increment usage
  UPDATE "profiles" 
  SET tweets_used = tweets_used + 1
  WHERE user_id = user_uuid;

  RETURN TRUE;
END;
$$;

-- Function to get agent statistics (secure aggregation)
CREATE OR REPLACE FUNCTION get_agent_stats(agent_uuid UUID)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  total_tweets BIGINT,
  total_replies BIGINT,
  avg_tweet_engagement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user owns this agent
  IF NOT EXISTS (
    SELECT 1 FROM "agents" 
    WHERE agents.agent_id = agent_uuid 
    AND agents.user_id::uuid = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied or agent not found';
  END IF;

  RETURN QUERY
  SELECT 
    a.agent_id,
    a.name as agent_name,
    COALESCE(tweet_stats.total_tweets, 0) as total_tweets,
    COALESCE(reply_stats.total_replies, 0) as total_replies,
    COALESCE(tweet_stats.avg_engagement, 0) as avg_tweet_engagement
  FROM "agents" a
  LEFT JOIN (
    SELECT 
      agent_id,
      COUNT(*) as total_tweets,
      AVG(likes + retweets + replies) as avg_engagement
    FROM "tweets" 
    WHERE agent_id = agent_uuid
    GROUP BY agent_id
  ) tweet_stats ON tweet_stats.agent_id = a.agent_id
  LEFT JOIN (
    SELECT 
      agent_id,
      COUNT(*) as total_replies
    FROM "replies" 
    WHERE agent_id = agent_uuid
    GROUP BY agent_id
  ) reply_stats ON reply_stats.agent_id = a.agent_id
  WHERE a.agent_id = agent_uuid;
END;
$$;

-- Function to safely manage cookies (with validation)
CREATE OR REPLACE FUNCTION upsert_user_cookie(
  cookie_key TEXT,
  cookie_value TEXT,
  cookie_domain TEXT DEFAULT '.twitter.com',
  cookie_path TEXT DEFAULT '/',
  cookie_expires TIMESTAMPTZ DEFAULT NULL,
  cookie_secure BOOLEAN DEFAULT TRUE,
  cookie_http_only BOOLEAN DEFAULT FALSE,
  cookie_same_site TEXT DEFAULT 'Lax',
  user_uuid TEXT DEFAULT auth.uid()::text
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user matches the requested user (unless service role)
  IF auth.uid()::text != user_uuid AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Validate domain (security check)
  IF cookie_domain NOT LIKE '%twitter.com%' AND cookie_domain NOT LIKE '%x.com%' THEN
    RAISE EXCEPTION 'Invalid domain. Only Twitter/X domains allowed.';
  END IF;

  -- Upsert cookie
  INSERT INTO "cookies" (
    user_id, key, value, domain, path, expires, secure, http_only, same_site
  ) VALUES (
    user_uuid, cookie_key, cookie_value, cookie_domain, cookie_path, 
    cookie_expires, cookie_secure, cookie_http_only, cookie_same_site
  )
  ON CONFLICT (user_id, key) 
  DO UPDATE SET
    value = EXCLUDED.value,
    domain = EXCLUDED.domain,
    path = EXCLUDED.path,
    expires = EXCLUDED.expires,
    secure = EXCLUDED.secure,
    http_only = EXCLUDED.http_only,
    same_site = EXCLUDED.same_site;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_plan_with_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_custom_generations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tweets_used(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_cookie(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, BOOLEAN, TEXT, TEXT) TO authenticated; 