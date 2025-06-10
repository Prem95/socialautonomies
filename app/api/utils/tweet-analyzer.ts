/**
 * Tweet analyzer utility
 * 
 * Provides functions to analyze tweets and determine if they should be responded to
 */

/**
 * Tweet scoring interface to determine priority of reply
 */
export interface TweetScore {
  tweet: any;
  score: number;
  reasonsToReply: string[];
  reasonsToSkip: string[];
}

/**
 * Configuration for tweet analysis
 */
export interface TweetAnalysisConfig {
  // Keywords to look for in tweets (high priority)
  priorityKeywords?: string[];
  
  // Keywords to look for in tweets (medium priority)
  interestKeywords?: string[];
  
  // Keywords to avoid in tweets
  avoidKeywords?: string[];
  
  // Minimum engagement score (based on likes, retweets, replies)
  minEngagementScore?: number;
  
  // Usernames to prioritize
  priorityUsers?: string[];
  
  // Usernames to avoid
  avoidUsers?: string[];
  
  // Whether to consider replies
  considerReplies?: boolean;
  
  // Whether to consider retweets
  considerRetweets?: boolean;
  
  // Minimum score to consider replying
  minScoreThreshold?: number;
}

/**
 * Default configuration for tweet analysis
 */
const defaultConfig: TweetAnalysisConfig = {
  priorityKeywords: [],
  interestKeywords: [],
  avoidKeywords: [],
  minEngagementScore: 0,
  priorityUsers: [],
  avoidUsers: [],
  considerReplies: true,
  considerRetweets: false,
  minScoreThreshold: 5
};

/**
 * Calculate engagement score based on likes, retweets, and replies
 * @param tweet The tweet to calculate engagement for
 * @returns Engagement score
 */
function calculateEngagementScore(tweet: any): number {
  const likeWeight = 1;
  const retweetWeight = 2;
  const replyWeight = 1.5;
  
  const likes = tweet.favoriteCount || 0;
  const retweets = tweet.retweetCount || 0;
  const replies = tweet.replyCount || 0;
  
  return (likes * likeWeight) + (retweets * retweetWeight) + (replies * replyWeight);
}

/**
 * Check if any keywords from a list are present in the text
 * @param text The text to check
 * @param keywords List of keywords to check for
 * @returns true if any keywords are found, false otherwise
 */
function containsKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Find keywords from a list that are present in the text
 * @param text The text to check
 * @param keywords List of keywords to check for
 * @returns Array of found keywords
 */
function findKeywords(text: string, keywords: string[]): string[] {
  if (!keywords || keywords.length === 0) return [];
  
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Analyze a single tweet and score it based on the config
 * @param tweet The tweet to analyze
 * @param config Configuration for analysis
 * @returns Score and reasoning for the tweet
 */
export function analyzeTweet(tweet: any, config: TweetAnalysisConfig = {}): TweetScore {
  // Merge with default config
  const cfg = { ...defaultConfig, ...config };
  
  const result: TweetScore = {
    tweet,
    score: 0,
    reasonsToReply: [],
    reasonsToSkip: []
  };
  
  // Skip if tweet is a reply and we're not considering replies
  if (tweet.isReply && !cfg.considerReplies) {
    result.reasonsToSkip.push("Tweet is a reply and replies are configured to be skipped");
    return result;
  }
  
  // Skip if tweet is a retweet and we're not considering retweets
  if (tweet.isRetweet && !cfg.considerRetweets) {
    result.reasonsToSkip.push("Tweet is a retweet and retweets are configured to be skipped");
    return result;
  }
  
  // Check user criteria
  const username = tweet.user?.screenName?.toLowerCase();
  
  if (username) {
    // Priority users get a significant boost
    if (cfg.priorityUsers?.some(user => user.toLowerCase() === username)) {
      result.score += 20;
      result.reasonsToReply.push(`User @${username} is on the priority list`);
    }
    
    // Avoid users get a significant penalty
    if (cfg.avoidUsers?.some(user => user.toLowerCase() === username)) {
      result.score -= 50;
      result.reasonsToSkip.push(`User @${username} is on the avoid list`);
    }
  }
  
  // Check content criteria
  const tweetText = tweet.text || '';
  
  // Priority keywords give a big boost
  const foundPriorityKeywords = findKeywords(tweetText, cfg.priorityKeywords || []);
  if (foundPriorityKeywords.length > 0) {
    result.score += foundPriorityKeywords.length * 10;
    result.reasonsToReply.push(`Contains priority keywords: ${foundPriorityKeywords.join(', ')}`);
  }
  
  // Interest keywords give a medium boost
  const foundInterestKeywords = findKeywords(tweetText, cfg.interestKeywords || []);
  if (foundInterestKeywords.length > 0) {
    result.score += foundInterestKeywords.length * 5;
    result.reasonsToReply.push(`Contains interest keywords: ${foundInterestKeywords.join(', ')}`);
  }
  
  // Avoid keywords give a penalty
  const foundAvoidKeywords = findKeywords(tweetText, cfg.avoidKeywords || []);
  if (foundAvoidKeywords.length > 0) {
    result.score -= foundAvoidKeywords.length * 15;
    result.reasonsToSkip.push(`Contains avoid keywords: ${foundAvoidKeywords.join(', ')}`);
  }
  
  // Check engagement
  const engagementScore = calculateEngagementScore(tweet);
  if (engagementScore > cfg.minEngagementScore!) {
    const bonus = Math.min(20, Math.floor(engagementScore / 10));
    result.score += bonus;
    result.reasonsToReply.push(`High engagement score: ${engagementScore}`);
  } else {
    result.reasonsToSkip.push(`Low engagement score: ${engagementScore}`);
  }
  
  // Longer tweets might have more context to respond to
  if (tweetText.length > 100) {
    result.score += 3;
    result.reasonsToReply.push("Longer tweet with more context");
  }
  
  // Media tweets are often more engaging
  if (tweet.mediaEntities && tweet.mediaEntities.length > 0) {
    result.score += 5;
    result.reasonsToReply.push("Contains media");
  }
  
  return result;
}

/**
 * Analyze multiple tweets and return them ranked by score
 * @param tweets Array of tweets to analyze
 * @param config Configuration for analysis
 * @returns Array of scored tweets, sorted by score (highest first)
 */
export function analyzeTweets(tweets: any[], config: TweetAnalysisConfig = {}): TweetScore[] {
  const scoredTweets = tweets.map(tweet => analyzeTweet(tweet, config));
  
  // Sort by score (highest first)
  return scoredTweets.sort((a, b) => b.score - a.score);
}

/**
 * Get recommended tweets to reply to
 * @param tweets Array of tweets to analyze
 * @param config Configuration for analysis
 * @returns Array of recommended tweets to reply to
 */
export function getRecommendedTweets(tweets: any[], config: TweetAnalysisConfig = {}): TweetScore[] {
  const cfg = { ...defaultConfig, ...config };
  const scoredTweets = analyzeTweets(tweets, cfg);
  
  // Filter tweets that meet the minimum score threshold
  return scoredTweets.filter(scored => scored.score >= cfg.minScoreThreshold!);
} 