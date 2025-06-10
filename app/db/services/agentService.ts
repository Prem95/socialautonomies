import { agentRepository } from '../repositories/agentRepository';
import { profileService } from './profileService';
import { planService } from './planService';
import { AgentCreateInput, AgentUpdateInput, AgentWithAll, AgentWithProfile, AgentWithTweets, LimitStatus, PaginationParams, SortParams } from '../types';
import { Agent } from '@prisma/client';
import { DatabaseError } from '../utils/errorHandler';
import { Prisma } from '@prisma/client';

export const agentService = {
  /**
   * Create a new agent
   */
  async createAgent(data: AgentCreateInput): Promise<Agent> {
    // Check if profile exists
    if (!data.profile?.connect?.userId) {
      throw new DatabaseError('Profile connection is required', 'INVALID_INPUT');
    }
    
    const userId = data.profile.connect.userId;
    const profileExists = await profileService.profileExists(userId);
    if (!profileExists) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Get profile with plan to check limits
    const profile = await profileService.getProfileWithPlan(userId);
    
    if (!profile.planId) {
      throw new DatabaseError('User does not have an active plan', 'PLAN_REQUIRED');
    }
    
    // Check if user has reached agent limit
    const { canCreate, used, limit } = await planService.checkAgentLimit(profile.planId, userId);
    
    if (!canCreate) {
      throw new DatabaseError(
        `Agent limit reached: ${used}/${limit}. Upgrade plan to create more agents.`,
        'LIMIT_REACHED'
      );
    }
    
    return await agentRepository.create(data);
  },

  /**
   * Get an agent by ID
   */
  async getAgentById(agentId: string): Promise<Agent> {
    console.log('Getting agent by ID:', agentId);
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    return agent;
  },

  /**
   * Get an agent by ID with user ownership validation - Optimized single query
   */
  async getAgentByIdForUser(userId: string, agentId: string): Promise<Agent> {
    console.log('Getting agent by ID for user:', { userId, agentId });
    
    // Single optimized query that validates ownership and retrieves agent
    const agent = await agentRepository.findFirstWhere({
      agentId,
      userId // This validates ownership in the same query
    });
    
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return agent;
  },

  /**
   * Get an agent with its tweets
   */
  async getAgentWithTweets(agentId: string): Promise<AgentWithTweets> {
    const agent = await agentRepository.findWithTweets(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    return agent;
  },

  /**
   * Get an agent with its profile
   */
  async getAgentWithProfile(agentId: string): Promise<AgentWithProfile> {
    const agent = await agentRepository.findWithProfile(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    return agent;
  },

  /**
   * Get an agent with all related data
   */
  async getAgentWithAll(agentId: string): Promise<AgentWithAll> {
    const agent = await agentRepository.findWithAll(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    return agent;
  },

  /**
   * Get agents by user ID
   */
  async getAgentsByUserId(userId: string, params?: PaginationParams & SortParams): Promise<Agent[]> {
    // Check if profile exists
    const profileExists = await profileService.profileExists(userId);
    if (!profileExists) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.findByUserId(userId, params);
  },

  /**
   * Update agent
   */
  async updateAgent(agentId: string, data: AgentUpdateInput): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.update(agentId, data);
  },

  /**
   * Update agent with user ownership validation
   */
  async updateAgentForUser(userId: string, agentId: string, data: AgentUpdateInput): Promise<Agent> {
    // Get agent and validate ownership
    const agent = await this.getAgentByIdForUser(userId, agentId);
    
    return await agentRepository.update(agentId, data);
  },

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.delete(agentId);
  },

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Can't start an already running agent
    if (agent.status === 'running') {
      throw new DatabaseError('Agent is already running', 'AGENT_ALREADY_RUNNING');
    }
    
    return await agentRepository.updateStatus(agentId, 'running');
  },

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Can't stop an already stopped agent
    if (agent.status === 'stopped') {
      throw new DatabaseError('Agent is already stopped', 'AGENT_ALREADY_STOPPED');
    }
    
    return await agentRepository.updateStatus(agentId, 'stopped');
  },

  /**
   * Get all running agents
   */
  async getRunningAgents(params?: PaginationParams): Promise<Agent[]> {
    return await agentRepository.findByStatus('running', params);
  },

  /**
   * Get all stopped agents
   */
  async getStoppedAgents(params?: PaginationParams): Promise<Agent[]> {
    return await agentRepository.findByStatus('stopped', params);
  },

  /**
   * Check if user can create an agent
   */
  async checkAgentLimit(userId: string): Promise<LimitStatus> {
    // Get profile with plan
    const profile = await profileService.getProfileWithPlan(userId);
    
    if (!profile.planId) {
      throw new DatabaseError('User does not have an active plan', 'PLAN_REQUIRED');
    }
    
    const agentCount = await agentRepository.countByUserId(userId);
    const maxAgents = profile.plan?.maxAgents || 0;
    
    return {
      used: agentCount,
      limit: maxAgents,
      remaining: maxAgents - agentCount,
      canCreate: agentCount < maxAgents
    };
  },

  /**
   * Update agent brand
   */
  async updateAgentBrand(agentId: string, brand: any): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.update(agentId, { brand });
  },

  /**
   * Update agent special hooks
   */
  async updateAgentSpecialHooks(agentId: string, specialHooks: any): Promise<Agent> {
    // Check if agent exists
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.update(agentId, { specialHooks });
  },

  /**
   * Get agents with tweet count
   */
  async getAgentsWithTweetCount(userId: string): Promise<AgentWithTweets[]> {
    // Check if profile exists
    const profileExists = await profileService.profileExists(userId);
    if (!profileExists) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await agentRepository.findWithTweetCount(userId);
  },

  /**
   * Get an agent including its TwitterAuth relation
   */
  async getAgentWithTwitterAuth(agentId: string): Promise<Agent & { twitterAuth: Prisma.TwitterAuthGetPayload<{}> | null }> {
    const agent = await agentRepository.findWithTwitterAuth(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    return agent;
  },

  /**
   * Get an agent including its TwitterAuth relation with user ownership validation
   */
  async getAgentWithTwitterAuthForUser(userId: string, agentId: string): Promise<Agent & { twitterAuth: Prisma.TwitterAuthGetPayload<{}> | null }> {
    const agent = await agentRepository.findWithTwitterAuth(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Validate ownership
    if (agent.userId !== userId) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return agent;
  },

  /**
   * Disconnect Twitter account for an agent
   */
  async disconnectTwitterForAgent(userId: string, agentId: string): Promise<Agent> {
    // 1. Find the agent and verify ownership
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
    }
    if (agent.userId !== userId) {
      throw new DatabaseError(`Agent ${agentId} does not belong to user ${userId}`, 'UNAUTHORIZED');
    }

    // 2. Delete the associated TwitterAuth record (if it exists)
    // We wrap this in a try-catch in case the relation doesn't exist or is already deleted
    try {
      await agentRepository.deleteTwitterAuth(agentId);
      console.log(`Deleted TwitterAuth relation for agent ${agentId}`);
    } catch (error) {
      // Log if deletion failed, but don't necessarily stop the process
      // It might fail if the relation was already removed or never existed.
      // Check the specific error type if more granular handling is needed.
      console.warn(`Could not delete TwitterAuth for agent ${agentId} (might be already disconnected):`, error);
    }

    // 3. Update the Agent status if it was running
    const agentUpdates: AgentUpdateInput = {};
    if (agent.status === 'running') {
      agentUpdates.status = 'stopped';
    }

    // Only update the agent if there are changes (status/message)
    if (Object.keys(agentUpdates).length > 0) {
        const updatedAgent = await agentRepository.update(agentId, agentUpdates);
        console.log(`Agent ${agentId} status updated after Twitter disconnect.`);
        return updatedAgent;
    } else {
       // If status didn't change, return the original agent object found earlier
       console.log(`Agent ${agentId} status did not need update after Twitter disconnect.`);
       // We should ideally return the agent *without* the potentially stale twitterAuth relation
       // Fetching it again ensures consistency, though slightly less efficient.
       const refreshedAgent = await agentRepository.findById(agentId);
       if (!refreshedAgent) { // Should not happen, but safety check
          throw new DatabaseError(`Agent with ID ${agentId} disappeared after disconnect`, 'INTERNAL_ERROR');
       }
       return refreshedAgent;
    }
  }
}; 