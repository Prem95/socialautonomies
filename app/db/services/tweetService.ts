import { tweetRepository } from '../repositories/tweetRepository';
import { agentService } from './agentService';
import { profileService } from './profileService';
import { planService } from './planService';
import { LimitStatus, PaginationParams, SortParams, TweetCreateInput, TweetUpdateInput, TweetWithAgent } from '../types';
import { Tweet } from '@prisma/client';
import { DatabaseError } from '../utils/errorHandler';

export const tweetService = {
  /**
   * Create a new tweet
   */
  async createTweet(data: TweetCreateInput): Promise<Tweet> {
    try {
      // Extract agent ID from the nested connect field
      if (!data.agent?.connect?.agentId) {
        throw new DatabaseError('Agent connection is required', 'INVALID_INPUT');
      }

      const agentId = data.agent.connect.agentId;

      // Check if agent exists
      const agent = await agentService.getAgentWithProfile(agentId);
      console.log('agent', agent);
      
      // Check if user has a plan
      if (!agent.profile.planId) {
        throw new DatabaseError('User does not have an active plan', 'PLAN_REQUIRED');
      }
      
      return await tweetRepository.create(data);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to create tweet: ${error instanceof Error ? error.message : String(error)}`, 'RECORD_NOT_FOUND');
    }
  },

  /**
   * Get a tweet by ID
   */
  async getTweetById(tweetId: string): Promise<Tweet> {
    const tweet = await tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    return tweet;
  },

  /**
   * Get a tweet with its agent
   */
  async getTweetWithAgent(tweetId: string): Promise<TweetWithAgent> {
    const tweet = await tweetRepository.findWithAgent(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    return tweet;
  },

  /**
   * Get tweets by agent ID
   */
  async getTweetsByAgentId(agentId: string, params?: PaginationParams & SortParams): Promise<Tweet[]> {
    // Check if agent exists
    try {
      await agentService.getAgentById(agentId);
      return await tweetRepository.findByAgentId(agentId, params);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
  },

  /**
   * Get tweets by user ID
   */
  async getTweetsByUserId(userId: string, params?: PaginationParams & SortParams): Promise<Tweet[]> {
    // Check if profile exists
    try {
      await profileService.getProfileById(userId);
      return await tweetRepository.findByUserId(userId, params);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
  },

  /**
   * Update tweet
   */
  async updateTweet(tweetId: string, data: TweetUpdateInput): Promise<Tweet> {
    const tweet = await tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await tweetRepository.update(tweetId, data);
  },

  /**
   * Update tweet metrics
   */
  async updateTweetMetrics(tweetId: string, likes: number, retweets: number, replies: number): Promise<Tweet> {
    const tweet = await tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await tweetRepository.updateMetrics(tweetId, likes, retweets, replies);
  },

  /**
   * Delete tweet
   */
  async deleteTweet(tweetId: string): Promise<Tweet> {
    const tweet = await tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await tweetRepository.delete(tweetId);
  },

  /**
   * Check if tweet exists
   */
  async tweetExists(tweetId: string): Promise<boolean> {
    const tweet = await tweetRepository.findById(tweetId);
    return !!tweet;
  },

  /**
   * Update X tweet ID and URL after posting
   */
  async updateTweetAfterPosting(tweetId: string, twitterTweetId: string, url: string): Promise<Tweet> {
    const tweet = await tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new DatabaseError(`Tweet with ID ${tweetId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await tweetRepository.update(tweetId, {
      twitterTweetId,
      url,
      postTime: new Date()
    });
  },

  /**
   * Check if an agent can post more tweets
   */
  async checkTweetLimit(agentId: string): Promise<LimitStatus> {
    // Get agent with profile and plan
    const agent = await agentService.getAgentWithAll(agentId);
    
    if (!agent.profile.planId) {
      throw new DatabaseError('User does not have an active plan', 'PLAN_REQUIRED');
    }
    
    const tweetCount = await tweetRepository.countByAgentId(agentId);
    const maxTweets = agent.profile.plan?.maxTweetsPerAgent || 0;
    
    return {
      used: tweetCount,
      limit: maxTweets,
      remaining: maxTweets - tweetCount,
      canCreate: tweetCount < maxTweets
    };
  },

  /**
   * Find tweets needing metrics update
   */
  async findTweetsNeedingUpdate(hours: number = 1, limit: number = 50): Promise<Tweet[]> {
    return await tweetRepository.findTweetsNeedingUpdate(hours, limit);
  },

  /**
   * Get most engaged tweets
   */
  async getMostEngagedTweets(params?: PaginationParams): Promise<Tweet[]> {
    return await tweetRepository.findMostEngaged(params);
  },

  /**
   * Schedule a tweet for future posting
   */
  async scheduleTweet(agentId: string, text: string, scheduledTime: Date): Promise<Tweet> {
    // Check tweet limit first
    const { canCreate } = await this.checkTweetLimit(agentId);
    
    if (!canCreate) {
      const { used, limit } = await this.checkTweetLimit(agentId);
      throw new DatabaseError(
        `Tweet limit reached: ${used}/${limit}. Upgrade plan to post more tweets.`,
        'LIMIT_REACHED'
      );
    }
    
    // Create the tweet
    return await tweetRepository.create({
      text,
      agent: {
        connect: { agentId }
      }
    });
  },

  /**
   * Get tweets by X tweet ID
   */
  async getTweetByTwitterTweetId(twitterTweetId: string): Promise<Tweet | null> {
    return await tweetRepository.findByTwitterTweetId(twitterTweetId);
  }
}; 