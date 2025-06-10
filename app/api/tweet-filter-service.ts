/**
 * Tweet Filter Service
 * 
 * Uses LLM to assess tweet quality and filter out spam, scams, and low-value content
 * before generating replies in the auto-engage system.
 */

import llmService from './llm-service';
import { LLMPrompts } from './prompts/llm-prompts';

// Interface for timeline tweets (from auto-engage-service)
interface TimelineTweet {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    screenName: string;
    profileImageUrl?: string;
    verified?: boolean;
  };
  replyCount: number;
  retweetCount: number;
  favoriteCount: number;
  isRetweet: boolean;
  isReply: boolean;
  mediaEntities?: any[];
}

// Interface for tweet quality assessment
export interface TweetQualityScore {
  tweetId: string;
  score: number; // 1-10 scale
  reasoning: string;
  shouldReply: boolean;
  flags: string[]; // ['spam', 'crypto', 'low-quality', etc.]
}

// Configuration for filtering
export interface FilterConfig {
  minQualityScore: number; // Default: 6
  categoryBlacklist: string[]; // ['crypto', 'spam', 'engagement-bait']
  maxBatchSize: number; // Default: 5 tweets per LLM call
}

/**
 * Tweet Filter Service
 */
export const tweetFilterService = {
  
  /**
   * Filter tweets using LLM quality assessment
   * 
   * @param tweets - Timeline tweets to filter
   * @param maxTweets - Maximum number of tweets to return
   * @param agent - Agent configuration for personalized filtering
   * @param config - Filtering configuration
   * @returns Filtered and scored tweets
   */
  async filterTweetsForQuality(
    tweets: TimelineTweet[],
    maxTweets: number,
    agent: any,
    config: FilterConfig = {
      minQualityScore: 6,
      categoryBlacklist: ['spam', 'crypto', 'engagement-bait', 'offensive'],
      maxBatchSize: 5
    }
  ): Promise<{
    success: boolean;
    filteredTweets?: TimelineTweet[];
    scores?: TweetQualityScore[];
    error?: string;
  }> {
    try {
      console.log(`[Tweet Filter] Starting quality assessment for ${tweets.length} tweets`);
      
      if (tweets.length === 0) {
        return {
          success: true,
          filteredTweets: [],
          scores: []
        };
      }

      // Process tweets in batches to avoid overwhelming the LLM
      const allScores: TweetQualityScore[] = [];
      const batchSize = config.maxBatchSize;
      
      for (let i = 0; i < tweets.length; i += batchSize) {
        const batch = tweets.slice(i, i + batchSize);
        
        try {
          const batchScores = await this.assessTweetBatch(batch, agent, config);
          allScores.push(...batchScores);
          
          // Small delay between batches to be respectful to the LLM API
          if (i + batchSize < tweets.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`[Tweet Filter] Error processing batch ${i}-${i + batchSize}:`, error);
          // Continue with other batches rather than failing entirely
        }
      }

      // Filter and sort tweets based on quality scores
      const validScores = allScores.filter(score => 
        score.shouldReply && 
        score.score >= config.minQualityScore &&
        !score.flags.some(flag => config.categoryBlacklist.includes(flag))
      );

      // Sort by score (highest first) and limit to maxTweets
      validScores.sort((a, b) => b.score - a.score);
      const topScores = validScores.slice(0, maxTweets);

      // Get corresponding tweets
      const filteredTweets = topScores.map(score => 
        tweets.find(tweet => tweet.id === score.tweetId)
      ).filter(Boolean) as TimelineTweet[];

      console.log(`[Tweet Filter] Quality assessment complete: ${allScores.length} assessed, ${topScores.length} selected`);
      
      // Log quality breakdown for debugging
      const qualityBreakdown = this.getQualityBreakdown(allScores);
      console.log(`[Tweet Filter] Quality breakdown:`, qualityBreakdown);

      return {
        success: true,
        filteredTweets,
        scores: topScores
      };

    } catch (error) {
      console.error('[Tweet Filter] Error in filterTweetsForQuality:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Assess a batch of tweets for quality using LLM
   * 
   * @param tweets - Batch of tweets to assess
   * @param agent - Agent configuration
   * @param config - Filter configuration
   * @returns Quality scores for the batch
   */
  async assessTweetBatch(
    tweets: TimelineTweet[],
    agent: any,
    config: FilterConfig
  ): Promise<TweetQualityScore[]> {
    try {
      // Create system prompt for tweet quality assessment
      const systemPrompt = LLMPrompts.createTweetQualityAssessmentPrompt(agent, config);
      
      // Create user prompt with tweet data
      const userPrompt = this.createBatchAssessmentPrompt(tweets);
      
      // Get LLM assessment
      const result = await llmService.generateText(systemPrompt, userPrompt);
      
      if (!result.success || !result.content) {
        throw new Error(`LLM assessment failed: ${result.error}`);
      }

      // Parse LLM response into structured scores
      const scores = this.parseLLMQualityResponse(result.content, tweets);
      
      return scores;

    } catch (error) {
      console.error('[Tweet Filter] Error in assessTweetBatch:', error);
      // Return default low scores for failed assessments
      return tweets.map(tweet => ({
        tweetId: tweet.id,
        score: 3, // Low score for failed assessment
        reasoning: 'Assessment failed',
        shouldReply: false,
        flags: ['assessment-failed']
      }));
    }
  },

  /**
   * Create user prompt for batch tweet assessment
   * 
   * @param tweets - Tweets to assess
   * @returns Formatted prompt for LLM
   */
  createBatchAssessmentPrompt(tweets: TimelineTweet[]): string {
    let prompt = `Please assess the following tweets for quality and reply-worthiness. Respond in the exact JSON format requested:\n\n`;
    
    tweets.forEach((tweet, index) => {
      prompt += `Tweet ${index + 1} (ID: ${tweet.id}):\n`;
      prompt += `Author: @${tweet.user.screenName} (${tweet.user.name})${tweet.user.verified ? ' ✓' : ''}\n`;
      prompt += `Text: "${tweet.text}"\n`;
      prompt += `Engagement: ${tweet.favoriteCount} likes, ${tweet.replyCount} replies, ${tweet.retweetCount} retweets\n`;
      prompt += `---\n`;
    });

    prompt += `\nRespond with a JSON array where each object has: tweetId, score (1-10), reasoning, shouldReply (boolean), flags (array of strings).\n`;
    prompt += `Example format: [{"tweetId":"123","score":8,"reasoning":"Thoughtful question about tech","shouldReply":true,"flags":[]}]`;

    return prompt;
  },

  /**
   * Parse LLM response into structured quality scores
   * 
   * @param llmResponse - Raw LLM response
   * @param tweets - Original tweets for fallback
   * @returns Parsed quality scores
   */
  parseLLMQualityResponse(llmResponse: string, tweets: TimelineTweet[]): TweetQualityScore[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        throw new Error('LLM response is not an array');
      }

      // Validate and clean up the parsed data
      return parsed.map((item: any) => ({
        tweetId: String(item.tweetId || ''),
        score: Math.max(1, Math.min(10, Number(item.score) || 1)),
        reasoning: String(item.reasoning || 'No reasoning provided'),
        shouldReply: Boolean(item.shouldReply),
        flags: Array.isArray(item.flags) ? item.flags.map(String) : []
      })).filter(score => score.tweetId); // Remove invalid entries

    } catch (error) {
      console.error('[Tweet Filter] Error parsing LLM response:', error);
      console.log('[Tweet Filter] Raw LLM response:', llmResponse);
      
      // Fallback: return low scores for all tweets
      return tweets.map(tweet => ({
        tweetId: tweet.id,
        score: 3,
        reasoning: 'Failed to parse LLM assessment',
        shouldReply: false,
        flags: ['parse-failed']
      }));
    }
  },

  /**
   * Get quality breakdown for logging/debugging
   * 
   * @param scores - All quality scores
   * @returns Quality statistics
   */
  getQualityBreakdown(scores: TweetQualityScore[]): {
    total: number;
    highQuality: number; // score >= 7
    mediumQuality: number; // score 4-6
    lowQuality: number; // score 1-3
    flaggedForSpam: number;
    flaggedForCrypto: number;
    shouldReply: number;
  } {
    return {
      total: scores.length,
      highQuality: scores.filter(s => s.score >= 7).length,
      mediumQuality: scores.filter(s => s.score >= 4 && s.score <= 6).length,
      lowQuality: scores.filter(s => s.score <= 3).length,
      flaggedForSpam: scores.filter(s => s.flags.includes('spam')).length,
      flaggedForCrypto: scores.filter(s => s.flags.includes('crypto')).length,
      shouldReply: scores.filter(s => s.shouldReply).length
    };
  },

  /**
   * Fallback filtering for when LLM is unavailable
   * 
   * @param tweets - Tweets to filter
   * @param maxTweets - Maximum tweets to return
   * @returns Basic filtered tweets
   */
  async fallbackFilter(tweets: TimelineTweet[], maxTweets: number): Promise<TimelineTweet[]> {
    console.log('[Tweet Filter] Using fallback filtering (no LLM)');
    
    // Basic keyword-based filtering
    const spam_keywords = [
      'crypto', 'bitcoin', 'nft', 'pump', 'moon', 'lambo', 'hodl',
      'rt if', 'follow me', 'dm me', 'link in bio', 'free money',
      'get rich', 'make money fast', 'investment opportunity'
    ];

    const filtered = tweets.filter(tweet => {
      const text = tweet.text.toLowerCase();
      
      // Filter out obviously spammy content
      const hasSpamKeywords = spam_keywords.some(keyword => text.includes(keyword));
      if (hasSpamKeywords) return false;
      
      // Filter out very short tweets (likely low quality)
      if (tweet.text.length < 15) return false;
      
      // Filter out tweets that are just emojis
      const emojiPattern = /^[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}\s]*$/u;
      if (emojiPattern.test(tweet.text)) return false;
      
      return true;
    });

    return filtered.slice(0, maxTweets);
  }
}; 