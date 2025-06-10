import prisma from '../utils/dbClient';
import { handleDatabaseError } from '../utils/errorHandler';
import { PaginationParams, SortParams, TweetCreateInput, TweetUpdateInput, TweetWithAgent } from '../types';
import { Tweet } from '@prisma/client';

export const tweetRepository = {
  /**
   * Create a new tweet
   */
  async create(data: TweetCreateInput): Promise<Tweet> {
    try {
      return await prisma.tweet.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a tweet by ID
   */
  async findById(tweetId: string): Promise<Tweet | null> {
    try {
      return await prisma.tweet.findUnique({
        where: { tweetId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a tweet with its agent
   */
  async findWithAgent(tweetId: string): Promise<TweetWithAgent | null> {
    try {
      return await prisma.tweet.findUnique({
        where: { tweetId },
        include: { agent: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get tweets by agent ID
   */
  async findByAgentId(agentId: string, params?: PaginationParams & SortParams): Promise<Tweet[]> {
    try {
      const { page = 1, limit = 10, field = 'postTime', order = 'desc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.tweet.findMany({
        where: { agentId },
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get tweets by user ID (through agents)
   */
  async findByUserId(userId: string, params?: PaginationParams & SortParams): Promise<Tweet[]> {
    try {
      const { page = 1, limit = 10, field = 'postTime', order = 'desc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.tweet.findMany({
        where: {
          agent: {
            userId
          }
        },
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get tweets by X tweet ID
   */
  async findByTwitterTweetId(twitterTweetId: string): Promise<Tweet | null> {
    try {
      return await prisma.tweet.findFirst({
        where: { twitterTweetId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all tweets
   */
  async findAll(params?: PaginationParams & SortParams): Promise<Tweet[]> {
    try {
      const { page = 1, limit = 10, field = 'postTime', order = 'desc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.tweet.findMany({
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update tweet
   */
  async update(tweetId: string, data: TweetUpdateInput): Promise<Tweet> {
    try {
      return await prisma.tweet.update({
        where: { tweetId },
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update tweet metrics
   */
  async updateMetrics(tweetId: string, likes: number, retweets: number, replies: number): Promise<Tweet> {
    try {
      return await prisma.tweet.update({
        where: { tweetId },
        data: { likes, retweets, replies }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete tweet
   */
  async delete(tweetId: string): Promise<Tweet> {
    try {
      return await prisma.tweet.delete({
        where: { tweetId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count tweets by agent ID
   */
  async countByAgentId(agentId: string): Promise<number> {
    try {
      return await prisma.tweet.count({
        where: { agentId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count tweets by user ID (through agents)
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      return await prisma.tweet.count({
        where: {
          agent: {
            userId
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get most engaged tweets
   */
  async findMostEngaged(params?: PaginationParams): Promise<Tweet[]> {
    try {
      const { limit = 10 } = params || {};
      
      return await prisma.tweet.findMany({
        take: limit,
        orderBy: [
          { likes: 'desc' },
          { retweets: 'desc' },
          { replies: 'desc' }
        ]
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Find tweets needing metrics update (older than 1 hour)
   */
  async findTweetsNeedingUpdate(hours: number = 1, limit: number = 50): Promise<Tweet[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      return await prisma.tweet.findMany({
        where: {
          postTime: { lt: cutoffTime },
          twitterTweetId: { not: null }
        },
        take: limit,
        orderBy: { postTime: 'desc' }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}; 