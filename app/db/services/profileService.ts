import { profileRepository } from '../repositories/profileRepository';
import { planService } from './planService';
import { PaginationParams, ProfileCreateInput, ProfileUpdateInput, ProfileWithAgents, ProfileWithAll, ProfileWithPlan, SortParams } from '../types';
import { Profile } from '@prisma/client';
import { DatabaseError } from '../utils/errorHandler';

export const profileService = {
  /**
   * Create a new profile
   */
  async createProfile(data: ProfileCreateInput): Promise<Profile> {
    // Check if plan exists if planId is provided
    if (data.plan?.connect?.planId) {
      const planId = BigInt(data.plan.connect.planId);
      const planExists = await planService.planExists(planId);
      if (!planExists) {
        throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
      }
      // Ensure planId is BigInt
      data.plan.connect.planId = planId;
    }
    
    return await profileRepository.create(data);
  },

  /**
   * Get a profile by user ID
   */
  async getProfileById(userId: string): Promise<Profile> {
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    return profile;
  },

  /**
   * Get a profile with its plan
   */
  async getProfileWithPlan(userId: string): Promise<ProfileWithPlan> {
    const profile = await profileRepository.findWithPlan(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    return profile;
  },

  /**
   * Get a profile with its agents
   */
  async getProfileWithAgents(userId: string): Promise<ProfileWithAgents> {
    const profile = await profileRepository.findWithAgents(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    return profile;
  },

  /**
   * Get a profile with all related data
   */
  async getProfileWithAll(userId: string): Promise<ProfileWithAll> {
    const profile = await profileRepository.findWithAll(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    return profile;
  },

  /**
   * Find profiles by Stripe customer ID
   */
  async getProfileByStripeCustomerId(stripeCustomerId: string): Promise<Profile | null> {
    return await profileRepository.findByStripeCustomerId(stripeCustomerId);
  },

  /**
   * Get all profiles
   */
  async getAllProfiles(params?: PaginationParams & SortParams): Promise<Profile[]> {
    return await profileRepository.findAll(params);
  },

  /**
   * Get profiles by plan ID
   */
  async getProfilesByPlanId(planId: bigint, params?: PaginationParams): Promise<Profile[]> {
    // Check if plan exists
    const planExists = await planService.planExists(planId);
    if (!planExists) {
      throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await profileRepository.findByPlanId(planId, params);
  },

  /**
   * Update profile
   */
  async updateProfile(userId: string, data: ProfileUpdateInput): Promise<Profile> {
    // Check if profile exists
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Check if plan exists if planId is provided
    if (data.plan?.connect?.planId) {
      const planId = BigInt(data.plan.connect.planId);
      const planExists = await planService.planExists(planId);
      if (!planExists) {
        throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
      }
      // Ensure planId is BigInt
      data.plan.connect.planId = planId;
    }
    
    return await profileRepository.update(userId, data);
  },

  /**
   * Delete profile
   */
  async deleteProfile(userId: string): Promise<Profile> {
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    return await profileRepository.delete(userId);
  },

  /**
   * Create or update profile (upsert)
   */
  async upsertProfile(userId: string, updateData: ProfileUpdateInput, createData: ProfileCreateInput): Promise<Profile> {
    // Check if plan exists if planId is provided in createData
    if (createData.plan?.connect?.planId) {
      const createPlanId = BigInt(createData.plan.connect.planId);
      const planExists = await planService.planExists(createPlanId);
      if (!planExists) {
        throw new DatabaseError(`Plan with ID ${createPlanId} not found`, 'RECORD_NOT_FOUND');
      }
      // Ensure planId is BigInt
      createData.plan.connect.planId = createPlanId;
    }
    
    // Check if plan exists if planId is provided in updateData
    if (updateData.plan?.connect?.planId) {
      const updatePlanId = BigInt(updateData.plan.connect.planId);
      const planExists = await planService.planExists(updatePlanId);
      if (!planExists) {
        throw new DatabaseError(`Plan with ID ${updatePlanId} not found`, 'RECORD_NOT_FOUND');
      }
      // Ensure planId is BigInt
      updateData.plan.connect.planId = updatePlanId;
    }
    
    return await profileRepository.upsert(userId, updateData, createData);
  },

  /**
   * Update profile's plan
   */
  async updateProfilePlan(userId: string, planId: bigint): Promise<Profile> {
    // Check if profile exists
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    // Check if plan exists
    const planExists = await planService.planExists(planId);
    if (!planExists) {
      throw new DatabaseError(`Plan with ID ${planId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await profileRepository.update(userId, {
      plan: {
        connect: { planId }
      }
    });
  },

  /**
   * Update profile's Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<Profile> {
    // Check if profile exists
    const profile = await profileRepository.findById(userId);
    if (!profile) {
      throw new DatabaseError(`Profile with user ID ${userId} not found`, 'RECORD_NOT_FOUND');
    }
    
    return await profileRepository.update(userId, { stripeCustomerId });
  },

  /**
   * Check if profile exists
   */
  async profileExists(userId: string): Promise<boolean> {
    const profile = await profileRepository.findById(userId);
    return !!profile;
  },

  /**
   * Create profile with default free plan
   */
  async createProfileWithFreePlan(userId: string): Promise<Profile> {
    // Find the free plan (assuming the free plan has a zero price)
    const plans = await planService.getAllPlans();
    const freePlan = plans.find(plan => Number(plan.price) === 0);
    
    if (!freePlan) {
      throw new DatabaseError('No free plan found in the system', 'RECORD_NOT_FOUND');
    }
    
    return await profileRepository.create({
      userId,
      plan: {
        connect: { planId: freePlan.planId }
      }
    });
  }
}; 