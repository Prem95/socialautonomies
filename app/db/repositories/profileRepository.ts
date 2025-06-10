import prisma from '../utils/dbClient';
import { handleDatabaseError } from '../utils/errorHandler';
import { PaginationParams, ProfileCreateInput, ProfileUpdateInput, ProfileWithAgents, ProfileWithAll, ProfileWithPlan, SortParams } from '../types';
import { Profile } from '@prisma/client';

export const profileRepository = {
  /**
   * Create a new profile
   */
  async create(data: ProfileCreateInput): Promise<Profile> {
    try {
      return await prisma.profile.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a profile by user ID
   */
  async findById(userId: string): Promise<Profile | null> {
    try {
      return await prisma.profile.findUnique({
        where: { userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a profile with its plan
   */
  async findWithPlan(userId: string): Promise<ProfileWithPlan | null> {
    try {
      return await prisma.profile.findUnique({
        where: { userId },
        include: { plan: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a profile with its agents
   */
  async findWithAgents(userId: string): Promise<ProfileWithAgents | null> {
    try {
      return await prisma.profile.findUnique({
        where: { userId },
        include: { agents: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get a profile with all related data
   */
  async findWithAll(userId: string): Promise<ProfileWithAll | null> {
    try {
      return await prisma.profile.findUnique({
        where: { userId },
        include: { 
          plan: true,
          agents: { 
            include: { 
              tweets: true 
            } 
          },
          cookies: true
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Find profiles by Stripe customer ID
   */
  async findByStripeCustomerId(stripeCustomerId: string): Promise<Profile | null> {
    try {
      return await prisma.profile.findFirst({
        where: { stripeCustomerId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get all profiles
   */
  async findAll(params?: PaginationParams & SortParams): Promise<Profile[]> {
    try {
      const { page = 1, limit = 10, field = 'profileCreatedAt', order = 'desc' } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.profile.findMany({
        skip,
        take: limit,
        orderBy: { [field]: order }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Get profiles by plan ID
   */
  async findByPlanId(planId: bigint, params?: PaginationParams): Promise<Profile[]> {
    try {
      const { page = 1, limit = 10 } = params || {};
      const skip = (page - 1) * limit;
      
      return await prisma.profile.findMany({
        where: { planId },
        skip,
        take: limit
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update profile
   */
  async update(userId: string, data: ProfileUpdateInput): Promise<Profile> {
    try {
      return await prisma.profile.update({
        where: { userId },
        data
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Delete profile
   */
  async delete(userId: string): Promise<Profile> {
    try {
      return await prisma.profile.delete({
        where: { userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count all profiles
   */
  async count(): Promise<number> {
    try {
      return await prisma.profile.count();
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Count profiles by plan ID
   */
  async countByPlanId(planId: bigint): Promise<number> {
    try {
      return await prisma.profile.count({
        where: { planId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  /**
   * Update or create a profile
   */
  async upsert(userId: string, updateData: ProfileUpdateInput, createData: ProfileCreateInput): Promise<Profile> {
    try {
      return await prisma.profile.upsert({
        where: { userId },
        update: updateData,
        create: createData as any
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}; 