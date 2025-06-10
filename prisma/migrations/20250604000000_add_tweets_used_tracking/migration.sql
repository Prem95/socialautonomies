-- Migration: Add tweets_used tracking to profiles table
-- This enables plan limit enforcement for tweets per agent feature

-- Add tweets_used column to profiles table
ALTER TABLE profiles ADD COLUMN tweets_used INT NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN profiles.tweets_used IS 'Total number of tweets posted by all agents for this user, used to enforce plan limits';

-- Create index for performance when querying usage
CREATE INDEX idx_profiles_tweets_used ON profiles(tweets_used);

-- Optional: Update existing profiles to have current tweet count
-- (This calculates current usage based on existing tweets)
UPDATE profiles 
SET tweets_used = (
  SELECT COALESCE(COUNT(*), 0) 
  FROM tweets t 
  INNER JOIN agents a ON t.agent_id = a.agent_id 
  WHERE a.user_id = profiles.user_id 
  AND t.status = 'posted'
); 