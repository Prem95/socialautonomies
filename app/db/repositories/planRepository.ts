import prisma from '../utils/dbClient';
import { handleDatabaseError } from '../utils/errorHandler';
import { PaginationParams, PlanCreateInput, PlanUpdateInput, PlanWithUsage, SortParams } from '../types';
import { Plan } from '@prisma/client';

export const planRepository = {
  /**
   * Create a new plan
   */
  async create(data: PlanCreateInput): Promise<Plan> {
    try {
      return await prisma.plan.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a plan by ID
   */
  async findById(planId: bigint): Promise<Plan | null> {
    try {
      return await prisma.plan.findUnique({
        where: { planId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a plan by Stripe price ID
   */
  async findByStripePriceId(stripePriceId: string): Promise<Plan | null> {
    try {
      return await prisma.plan.findFirst({
        where: { stripePriceId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all plans
   */
  async findAll(params?: PaginationParams & SortParams): Promise<Plan[]> {
    try {
      const { page = 1, limit = 10, field = 'price', order = 'asc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.plan.findMany({
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update plan
   */
  async update(planId: bigint, data: PlanUpdateInput): Promise<Plan> {
    try {
      return await prisma.plan.update({
        where: { planId },
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete plan
   */
  async delete(planId: bigint): Promise<Plan> {
    try {
      return await prisma.plan.delete({
        where: { planId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count all plans
   */
  async count(): Promise<number> {
    try {
      return await prisma.plan.count();
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get plans with usage statistics
   */
  async getPlansWithUsage(): Promise<PlanWithUsage[]> {
    try {
      // Get all plans
      const plans = await prisma.plan.findMany();
      
      // For each plan, get the count of users and agents
      const plansWithUsage = await Promise.all(
        plans.map(async (plan) => {
          const userCount = await prisma.profile.count({
            where: { planId: plan.planId }
          });
          
          const agentCount = await prisma.agent.count({
            where: {
              profile: { planId: plan.planId }
            }
          });
          
          return {
            ...plan,
            currentActiveUsers: userCount,
            totalAgents: agentCount
          };
        })
      );
      
      return plansWithUsage;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}; 