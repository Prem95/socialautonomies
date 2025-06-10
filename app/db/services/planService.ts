import { planRepository } from '../repositories/planRepository';
import prisma from '../utils/dbClient';
import { PaginationParams, PlanCreateInput, PlanUpdateInput, PlanWithUsage, SortParams } from '../types';
import { Plan } from '@prisma/client';
import { DatabaseError } from '../utils/errorHandler';

export const planService = {
  /**
   * Create a new plan
   */
  async createPlan(data: PlanCreateInput): Promise<Plan> {
    return await planRepository.create(data);
  },

  /**
   * Get a plan by ID
   */
  async getPlanById(planId: bigint): Promise<Plan> {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
    }
    return plan;
  },

  /**
   * Get a plan by Stripe price ID
   */
  async getPlanByStripePriceId(stripePriceId: string): Promise<Plan | null> {
    return await planRepository.findByStripePriceId(stripePriceId);
  },

  /**
   * Get all plans
   */
  async getAllPlans(params?: PaginationParams & SortParams): Promise<Plan[]> {
    return await planRepository.findAll(params);
  },

  /**
   * Update plan
   */
  async updatePlan(planId: bigint, data: PlanUpdateInput): Promise<Plan> {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
    }
    return await planRepository.update(planId, data);
  },

  /**
   * Delete plan
   */
  async deletePlan(planId: bigint): Promise<Plan> {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
    }
    return await planRepository.delete(planId);
  },

  /**
   * Get plans with usage statistics
   */
  async getPlansWithUsage(): Promise<PlanWithUsage[]> {
    return await planRepository.getPlansWithUsage();
  },

  /**
   * Get plan with specified constraints
   */
  async getPlanByConstraints(maxAgents: number, maxTweetsPerAgent: number): Promise<Plan | null> {
    const plans = await planRepository.findAll();
    
    // Filter plans that meet the criteria and sort by price (cheapest first)
    const filteredPlans = plans
      .filter(plan => plan.maxAgents >= maxAgents && plan.maxTweetsPerAgent >= maxTweetsPerAgent)
      .sort((a, b) => Number(a.price) - Number(b.price));
    
    return filteredPlans.length > 0 ? filteredPlans[0] : null;
  },

  /**
   * Check if a plan exists
   */
  async planExists(planId: bigint): Promise<boolean> {
    const plan = await planRepository.findById(planId);
    return !!plan;
  },

  /**
   * Check agent limit for a plan
   */
  async checkAgentLimit(planId: bigint, userId: string): Promise<{ canCreate: boolean, used: number, limit: number }> {
    const plan = await this.getPlanById(planId);
    
    // Count agents for the user
    const agentCount = await prisma.agent.count({
      where: { userId }
    });
    
    return {
      canCreate: agentCount < plan.maxAgents,
      used: agentCount,
      limit: plan.maxAgents
    };
  },

  /**
   * Check tweet limit for a plan and agent
   */
  async checkTweetLimit(planId: bigint, agentId: string): Promise<{ canCreate: boolean, used: number, limit: number }> {
    const plan = await this.getPlanById(planId);
    
    // Count tweets for the agent
    const tweetCount = await prisma.tweet.count({
      where: { agentId }
    });
    
    return {
      canCreate: tweetCount < plan.maxTweetsPerAgent,
      used: tweetCount,
      limit: plan.maxTweetsPerAgent
    };
  }
}; 