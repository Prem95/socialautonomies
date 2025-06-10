import prisma from '../utils/dbClient';
import { handleDatabaseError } from '../utils/errorHandler';
import { AgentCreateInput, AgentUpdateInput, AgentWithAll, AgentWithProfile, AgentWithTweets, PaginationParams, SortParams } from '../types';
import { Prisma, PrismaClient } from '@prisma/client';

// Use enum locally to match schema
type AgentStatus = 'stopped' | 'running' | 'error';
type Agent = Prisma.AgentGetPayload<{}>;

export const agentRepository = {
  /**
   * Create a new agent
   */
  async create(data: AgentCreateInput): Promise<Agent> {
    try {
      return await prisma.agent.create({ 
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get an agent by ID
   */
  async findById(agentId: string): Promise<Agent | null> {
    try {
      return await prisma.agent.findUnique({
        where: { agentId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Find first agent matching conditions - Optimized for single query with conditions
   */
  async findFirstWhere(where: Prisma.AgentWhereInput): Promise<Agent | null> {
    try {
      return await prisma.agent.findFirst({
        where
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get agents by user ID
   */
  async findByUserId(userId: string, params?: PaginationParams & SortParams): Promise<Agent[]> {
    try {
      const { page = 1, limit = 10, field = 'name', order = 'asc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.agent.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get an agent with its tweets
   */
  async findWithTweets(agentId: string): Promise<AgentWithTweets | null> {
    try {
      return await prisma.agent.findUnique({
        where: { agentId },
        include: { tweets: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get an agent with its profile
   */
  async findWithProfile(agentId: string): Promise<AgentWithProfile | null> {
    try {
      return await prisma.agent.findUnique({
        where: { agentId },
        include: { profile: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get an agent with all related data
   */
  async findWithAll(agentId: string): Promise<AgentWithAll | null> {
    try {
      return await prisma.agent.findUnique({
        where: { agentId },
        include: {
          tweets: true,
          profile: {
            include: { plan: true }
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all agents
   */
  async findAll(params?: PaginationParams & SortParams): Promise<Agent[]> {
    try {
      const { page = 1, limit = 10, field = 'name', order = 'asc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.agent.findMany({
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get agents by status
   */
  async findByStatus(status: AgentStatus, params?: PaginationParams): Promise<Agent[]> {
    try {
      const { page = 1, limit = 10 } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.agent.findMany({
        where: { status },
        skip,
        take: limit
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update agent
   */
  async update(agentId: string, data: AgentUpdateInput): Promise<Agent> {
    try {
      return await prisma.agent.update({
        where: { agentId },
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update agent status
   */
  async updateStatus(agentId: string, status: AgentStatus): Promise<Agent> {
    try {
      return await prisma.agent.update({
        where: { agentId },
        data: { 
          status,
          ...(status === 'running' 
              ? { startTime: new Date() } 
              : { endTime: new Date() })
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete agent
   */
  async delete(agentId: string): Promise<Agent> {
    try {
      return await prisma.agent.delete({
        where: { agentId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count agents by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      return await prisma.agent.count({
        where: { userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count agents by status
   */
  async countByStatus(status: AgentStatus): Promise<number> {
    try {
      return await prisma.agent.count({
        where: { status }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count all agents
   */
  async count(): Promise<number> {
    try {
      return await prisma.agent.count();
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get agents with tweet count
   */
  async findWithTweetCount(userId: string): Promise<AgentWithTweets[]> {
    try {
      const agents = await prisma.agent.findMany({
        where: { userId },
        include: { tweets: true }
      });
      
      return agents.map((agent: Agent & { tweets: any[] }) => ({
        ...agent,
        tweetCount: agent.tweets.length,
        recentTweets: agent.tweets.slice(0, 5)
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get an agent including its TwitterAuth relation
   */
  async findWithTwitterAuth(agentId: string): Promise<Agent & { twitterAuth: Prisma.TwitterAuthGetPayload<{}> | null } | null> {
    try {
      return await prisma.agent.findUnique({
        where: { agentId },
        include: { twitterAuth: true } // Include the relation
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete TwitterAuth associated with an agent
   */
  async deleteTwitterAuth(agentId: string): Promise<Prisma.BatchPayload> {
    try {
      // Use deleteMany as the relation might not enforce a unique twitterAuthId per agentId directly
      // in all database states, although the schema implies a unique agentId.
      // This safely removes any matching records.
      return await prisma.twitterAuth.deleteMany({
        where: { agentId },
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}; 