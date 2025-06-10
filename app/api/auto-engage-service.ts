/**
 * Auto-Engage Service - Simplified Version
 * 
 * Simple automated engagement: fetch tweets → generate replies → post sequentially
 */

import prisma, { schedulerQueries } from '../db/utils/dbClient';
import { twitterAuthService } from './twitter-auth-service';
import llmService from './llm-service';
import { TwitterApi } from './twitter-api';
import { tweetFilterService, TweetQualityScore, FilterConfig } from './tweet-filter-service';
import { Scraper } from '../scraper';

// Define ReplyStatus enum locally
enum ReplyStatus {
  POSTING = 'posting',
  POSTED = 'posted',
  FAILED = 'failed',
  PENDING = 'pending'
}

// Define interfaces
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

interface AutoEngageConfig {
  maxReplies: number;
  frequencyHours: number;
  useQualityFilter?: boolean; // Enable/disable LLM filtering
  minQualityScore?: number; // Minimum quality score (1-10)
}

/**
 * Auto-Engage Service - Simplified
 */
export const autoEngageService = {
  /**
   * Fetch timeline tweets with basic filtering
   * 
   * @param userId User ID for authentication
   * @param agent Agent configuration
   * @param config Auto-engage configuration
   * @returns Selected tweets for replies
   */
  async fetchTimelineTweets(
    userId: string, 
    agent: any, 
    config: AutoEngageConfig
  ): Promise<{
    success: boolean;
    tweets?: TimelineTweet[];
    error?: string;
  }> {
    try {
      console.log(`[Auto-Engage] Fetching timeline for agent ${agent.agentId}`);
      
      // Fetch timeline tweets (max 10 as requested)
      const maxTweets = Math.min(config.maxReplies, 10);
      const timelineResult = await twitterAuthService.getHomeTimeline(userId, maxTweets);
      
      if (!timelineResult.success || !timelineResult.tweets) {
        return {
          success: false,
          error: timelineResult.error || 'Failed to fetch timeline'
        };
      }
      
      const timelineTweets = timelineResult.tweets as TimelineTweet[];
      console.log(`[Auto-Engage] Fetched ${timelineTweets.length} timeline tweets`);
      
      // Basic filtering - only skip our own tweets and retweets
      const eligibleTweets = await this.basicFilter(timelineTweets, agent.agentId, agent.twitterUsername);
      
      // Limit to maxReplies
      const selectedTweets = eligibleTweets.slice(0, config.maxReplies);
      
      console.log(`[Auto-Engage] Selected ${selectedTweets.length} tweets for replies`);
      
      return {
        success: true,
        tweets: selectedTweets
      };
      
    } catch (error) {
      console.error('[Auto-Engage] Error fetching timeline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Basic filtering - only essential filters
   * 
   * @param tweets Timeline tweets
   * @param agentId Agent ID
   * @param agentTwitterUsername Agent's Twitter username
   * @returns Filtered tweets
   */
  async basicFilter(
    tweets: TimelineTweet[], 
    agentId: string,
    agentTwitterUsername?: string
  ): Promise<TimelineTweet[]> {
    // Get tweets we've already replied to or are in the process of replying to
    // Include ALL statuses except 'failed' and 'rejected' to prevent duplicates
    const existingReplies = await prisma.reply.findMany({
      where: {
        agentId,
        status: { 
          in: [
            ReplyStatus.POSTED, 
            ReplyStatus.POSTING, 
            ReplyStatus.PENDING
          ] 
        }
      },
      select: { originalTweetId: true }
    });
    
    const repliedTweetIds = new Set(existingReplies.map(r => r.originalTweetId));
    
    if (repliedTweetIds.size > 0) {
      console.log(`[Auto-Engage] Found ${repliedTweetIds.size} existing/pending replies for agent ${agentId}`);
    }
    
    return tweets.filter(tweet => {
      // Skip our own tweets
      if (agentTwitterUsername && tweet.user.screenName.toLowerCase() === agentTwitterUsername.toLowerCase()) {
        return false;
      }
      
      // Skip retweets
      if (tweet.isRetweet) {
        return false;
      }
      
      // Skip tweets we've already replied to
      if (repliedTweetIds.has(tweet.id)) {
        return false;
      }
      
      return true;
    });
  },

  /**
   * Apply LLM quality filtering to tweets
   * 
   * @param tweets Tweets to filter
   * @param agent Agent configuration
   * @param config Auto-engage configuration
   * @returns Quality-filtered tweets
   */
  async applyQualityFilter(
    tweets: TimelineTweet[],
    agent: any,
    config: AutoEngageConfig
  ): Promise<{
    success: boolean;
    filteredTweets?: TimelineTweet[];
    qualityScores?: TweetQualityScore[];
    error?: string;
  }> {
    try {
      // Check if quality filtering is enabled
      if (!config.useQualityFilter) {
        console.log('[Auto-Engage] Quality filtering disabled, using all tweets');
        return {
          success: true,
          filteredTweets: tweets.slice(0, config.maxReplies),
          qualityScores: []
        };
      }

      console.log(`[Auto-Engage] Applying LLM quality filter to ${tweets.length} tweets`);

      // Configure filtering
      const filterConfig: FilterConfig = {
        minQualityScore: config.minQualityScore || 6,
        categoryBlacklist: ['spam', 'crypto', 'engagement-bait', 'offensive'],
        maxBatchSize: 5
      };

      // Apply LLM filtering
      const filterResult = await tweetFilterService.filterTweetsForQuality(
        tweets,
        config.maxReplies,
        agent,
        filterConfig
      );

      if (!filterResult.success) {
        console.warn('[Auto-Engage] LLM filtering failed, falling back to basic filter');
        const fallbackTweets = await tweetFilterService.fallbackFilter(tweets, config.maxReplies);
        return {
          success: true,
          filteredTweets: fallbackTweets,
          qualityScores: [],
          error: `LLM filtering failed: ${filterResult.error}`
        };
      }

      console.log(`[Auto-Engage] Quality filtering complete: ${filterResult.filteredTweets?.length || 0} high-quality tweets selected`);

      return {
        success: true,
        filteredTweets: filterResult.filteredTweets || [],
        qualityScores: filterResult.scores || []
      };

    } catch (error) {
      console.error('[Auto-Engage] Error in quality filtering:', error);
      
      // Fallback to basic filtering
      try {
        const fallbackTweets = await tweetFilterService.fallbackFilter(tweets, config.maxReplies);
        return {
          success: true,
          filteredTweets: fallbackTweets,
          qualityScores: [],
          error: `Quality filtering failed, used fallback: ${error instanceof Error ? error.message : String(error)}`
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Both quality filtering and fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        };
      }
    }
  },

  /**
   * Generate replies for all tweets
   * 
   * @param tweets Tweets to generate replies for
   * @param agent Agent configuration
   * @returns Generated replies
   */
  async generateReplies(
    tweets: TimelineTweet[], 
    agent: any
  ): Promise<{
    success: boolean;
    replies?: Array<{
      tweetId: string;
      replyText: string;
    }>;
    error?: string;
  }> {
    try {
      console.log(`[Auto-Engage] Generating replies for ${tweets.length} tweets`);
      
      const replies = [];
      
      for (const tweet of tweets) {
        try {
          // Generate reply using LLM
          const tweetContext = `Author: @${tweet.user.screenName} (${tweet.user.name})\nTweet: "${tweet.text}"`;
          const replyText = await llmService.generateAgentTweetReply(agent.agentId, tweetContext, agent);
          
          if (replyText) {
            replies.push({
              tweetId: tweet.id,
              replyText: replyText
            });
            console.log(`[Auto-Engage] Generated reply for tweet ${tweet.id}`);
          } else {
            console.warn(`[Auto-Engage] Failed to generate reply for tweet ${tweet.id}`);
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`[Auto-Engage] Error generating reply for tweet ${tweet.id}:`, error);
        }
      }
      
      console.log(`[Auto-Engage] Generated ${replies.length} replies successfully`);
      
      return {
        success: true,
        replies
      };
      
    } catch (error) {
      console.error('[Auto-Engage] Error generating replies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Post replies sequentially
   * 
   * @param agentId Agent ID
   * @param userId User ID
   * @param tweets Original tweets
   * @param replies Generated replies
   * @returns Posting results
   */
  async postReplies(
    agentId: string,
    userId: string,
    tweets: TimelineTweet[],
    replies: Array<{ tweetId: string; replyText: string }>
  ): Promise<{
    success: boolean;
    posted?: number;
    failed?: number;
    error?: string;
  }> {
    try {
      console.log(`[Auto-Engage] Starting to post ${replies.length} replies for agent ${agentId}`);
      
      // Check reply usage limits before posting
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          plan: {
            select: {
              maxRepliesPerAgent: true
            }
          }
        }
      });

      if (!profile || !profile.plan) {
        return {
          success: false,
          error: 'User profile or plan not found'
        };
      }

      const currentUsage = profile.repliesUsed;
      const monthlyLimit = profile.plan.maxRepliesPerAgent;
      const remaining = Math.max(0, monthlyLimit - currentUsage);

      console.log(`[Auto-Engage] Reply usage check: ${currentUsage}/${monthlyLimit} used, ${remaining} remaining`);

      if (remaining === 0) {
        return {
          success: false,
          error: `Monthly reply limit of ${monthlyLimit} reached. Upgrade to Standard plan for 200 replies/month.`
        };
      }

      // Limit replies to what's available within the monthly quota
      const repliesToPost = replies.slice(0, remaining);
      const skippedDueToLimit = replies.length - repliesToPost.length;
      
      if (skippedDueToLimit > 0) {
        console.log(`[Auto-Engage] Limiting to ${repliesToPost.length} replies due to monthly quota (${skippedDueToLimit} skipped)`);
      }
      
      const agent = await prisma.agent.findUnique({
        where: { agentId },
        include: {
          twitterAuth: true
        }
      });
      
      if (!agent?.twitterAuth?.accessToken) {
        return {
          success: false,
          error: 'Twitter authentication required'
        };
      }
      
      const scraper = new Scraper();
      
      // Check if login is successful and handle Cloudflare blocks
      try {
        await scraper.login(agent.twitterAuth.accessToken, agent.twitterAuth.accessSecret);
        
        // Verify login by checking if we can access basic account info
        const loginVerification = await scraper.getProfile(agent.twitterAuth.username || 'me');
        if (!loginVerification) {
          throw new Error('Login verification failed - session may be expired');
        }
        
      } catch (loginError: any) {
        const errorMessage = loginError.message || String(loginError);
        
                 // Check for Cloudflare blocks
         if (errorMessage.includes('<!DOCTYPE html>') && errorMessage.includes('Cloudflare')) {
           console.error('[Auto-Engage] Twitter login blocked by Cloudflare bot protection');
           
           // Notify user about the issue
           await this.createUserNotification(
             userId,
             agentId,
             'cloudflare_block',
             'Auto-engage temporarily blocked by X. System will retry automatically in 30 minutes.'
           );
           
           return {
             success: false,
             error: 'Twitter access temporarily blocked. Please try again in 15-30 minutes or re-authenticate your X account.',
             posted: 0,
             failed: replies.length
           };
         }
         
         // Check for authentication errors
         if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
           console.error('[Auto-Engage] Twitter authentication expired or invalid');
           
           // Notify user about expired authentication
           await this.createUserNotification(
             userId,
             agentId,
             'auth_expired',
             'X account authentication expired. Please reconnect your X account in agent settings.'
           );
           
           return {
             success: false,
             error: 'X account authentication expired. Please reconnect your X account in the agent settings.',
             posted: 0,
             failed: replies.length
           };
         }
        
        // General login error
        console.error('[Auto-Engage] Twitter login failed:', errorMessage);
        return {
          success: false,
          error: 'Unable to connect to X. Please check your account connection and try again.',
          posted: 0,
          failed: replies.length
        };
      }
      
      let posted = 0;
      let failed = 0;
      
      for (const reply of repliesToPost) {
        try {
          const matchingTweet = tweets.find(t => t.id === reply.tweetId);
          if (!matchingTweet) {
            console.warn(`[Auto-Engage] No matching tweet found for reply ${reply.tweetId}`);
            failed++;
            continue;
          }
          
          // Save reply to database first
          let savedReply;
          try {
            savedReply = await prisma.reply.create({
              data: {
                agentId,
                originalTweetId: reply.tweetId,
                originalTweetText: matchingTweet.text.substring(0, 500),
                originalTweetUser: matchingTweet.user.screenName,
                replyText: reply.replyText,
                status: ReplyStatus.POSTING,
                score: 0,
                confidence: 0.8
              }
            });
          } catch (error: any) {
            // Handle unique constraint violation gracefully
            if (error.code === 'P2002' && error.meta?.target?.includes('agent_id') && error.meta?.target?.includes('original_tweet_id')) {
              console.log(`[Auto-Engage] Skipping duplicate reply for tweet ${reply.tweetId} - already exists`);
              continue; // Skip this reply and move to the next one
            }
            throw error; // Re-throw if it's a different error
          }
          
          // Post the reply
          const replyResponse = await scraper.sendTweet(reply.replyText, reply.tweetId);
          
          if (replyResponse) {
            // Extract reply ID if possible
            let twitterReplyId: string | null = null;
            try {
              const responseData = await replyResponse.json();
              twitterReplyId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
            } catch (parseError) {
              console.warn('[Auto-Engage] Could not parse reply ID from response');
            }
            
            // Update to posted
            await prisma.reply.update({
              where: { replyId: savedReply.replyId },
              data: { 
                status: ReplyStatus.POSTED,
                postedTime: new Date(),
                twitterReplyId
              }
            });
            
            // Increment reply usage counter
            await prisma.profile.update({
              where: { userId },
              data: {
                repliesUsed: {
                  increment: 1
                }
              }
            });
            
            posted++;
            console.log(`[Auto-Engage] Posted reply to tweet ${reply.tweetId} - usage now: ${currentUsage + posted}/${monthlyLimit}`);
          } else {
            // Update to failed
            await prisma.reply.update({
              where: { replyId: savedReply.replyId },
              data: { status: ReplyStatus.FAILED }
            });
            
            failed++;
            console.error(`[Auto-Engage] Failed to post reply to tweet ${reply.tweetId}`);
          }
          
          // Delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          failed++;
          console.error(`[Auto-Engage] Error posting reply to tweet ${reply.tweetId}:`, error);
        }
      }
      
      console.log(`[Auto-Engage] Posting completed: ${posted} posted, ${failed} failed, ${skippedDueToLimit} skipped due to monthly limit`);
      
      return {
        success: true,
        posted,
        failed
      };
      
    } catch (error) {
      console.error('[Auto-Engage] Error posting replies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Run simplified auto-engage cycle
   * 
   * @param agentId Agent ID
   * @param userId User ID
   * @returns Cycle results
   */
  async runAutoEngageCycle(
    agentId: string, 
    userId: string
  ): Promise<{
    success: boolean;
    results?: {
      tweetsFetched: number;
      tweetsAfterFiltering: number;
      repliesGenerated: number;
      repliesPosted: number;
      repliesFailed: number;
      qualityScores: TweetQualityScore[];
    };
    error?: string;
  }> {
    try {
      console.log(`[Auto-Engage] Starting simplified auto-engage cycle for agent ${agentId}`);
      
      // Get agent configuration
      const agent = await prisma.agent.findUnique({
        where: { agentId },
        include: { profile: true }
      });
      
      if (!agent || !agent.autoEngageEnabled) {
        return {
          success: false,
          error: 'Agent not found or auto-engage not enabled'
        };
      }

      // Helper function to get quality score from strictness level
      const getQualityScoreFromStrictness = (level: number): number => {
        if (level <= 1) return 2; // Less strict
        if (level <= 3) return 4; // Medium strict  
        return 6; // More strict (4-5)
      };
      
      const config: AutoEngageConfig = {
        maxReplies: agent.autoEngageMaxReplies || 3,
        frequencyHours: agent.autoEngageFrequencyHours || 4,
        useQualityFilter: agent.autoEngageQualityFilter !== undefined ? agent.autoEngageQualityFilter : true,
        minQualityScore: getQualityScoreFromStrictness(agent.autoEngageStrictnessLevel || 2)
      };
      
      // Step 1: Fetch timeline tweets
      const fetchResult = await this.fetchTimelineTweets(userId, agent, config);
      
      if (!fetchResult.success || !fetchResult.tweets) {
        return {
          success: false,
          error: fetchResult.error
        };
      }
      
      // Step 2: Apply LLM quality filtering
      const filterResult = await this.applyQualityFilter(fetchResult.tweets, agent, config);
      
      if (!filterResult.success || !filterResult.filteredTweets) {
        return {
          success: false,
          error: filterResult.error
        };
      }
      
      // Step 3: Generate replies for high-quality tweets
      const replyResult = await this.generateReplies(filterResult.filteredTweets, agent);
      
      if (!replyResult.success || !replyResult.replies) {
        return {
          success: false,
          error: replyResult.error
        };
      }
      
      // Step 4: Post all replies sequentially
      const postResult = await this.postReplies(
        agentId,
        userId,
        filterResult.filteredTweets,
        replyResult.replies
      );
      
      // Always update lastAutoEngageTime to prevent rapid retries, regardless of posting success
      // This prevents the agent from being picked up again immediately on the next cron cycle
      await prisma.agent.update({
        where: { agentId },
        data: { lastAutoEngageTime: new Date() }
      });
      
      const results = {
        tweetsFetched: fetchResult.tweets.length,
        tweetsAfterFiltering: filterResult.filteredTweets.length,
        repliesGenerated: replyResult.replies.length,
        repliesPosted: postResult.posted || 0,
        repliesFailed: postResult.failed || 0,
        qualityScores: filterResult.qualityScores || []
      };
      
      if (!postResult.success) {
        console.log(`[Auto-Engage] Cycle completed with posting errors for agent ${agentId}:`, results);
        return {
          success: false,
          error: postResult.error,
          results // Include partial results even on failure
        };
      }
      
      console.log(`[Auto-Engage] Simplified cycle completed successfully for agent ${agentId}:`, results);
      
      return {
        success: true,
        results
      };
      
    } catch (error) {
      console.error(`[Auto-Engage] Error running simplified auto-engage cycle for agent ${agentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Create a user notification for auto-engage issues
   */
  async createUserNotification(
    userId: string,
    agentId: string,
    type: 'cloudflare_block' | 'auth_expired' | 'connection_error',
    message: string
  ): Promise<void> {
    try {
      // Store notification in database (you might want to create a notifications table)
      // For now, we'll log it and could extend this to email/dashboard notifications
      console.log(`[Auto-Engage] Notification for user ${userId}: ${message}`);
      
      // Update agent status to reflect the issue
      await prisma.agent.update({
        where: { agentId },
        data: {
          // You could add a status field or notes field to track issues
          status: type === 'auth_expired' ? 'disconnected' : 'running'
        }
      });
      
      // Future: Send email notification, dashboard alert, etc.
      
    } catch (error) {
      console.error('[Auto-Engage] Failed to create user notification:', error);
    }
  }
}; 