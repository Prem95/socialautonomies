import prisma from '@/app/db/utils/dbClient';

/**
 * Ensures that a user profile exists for the given user ID
 * Creates a profile if it doesn't exist
 * 
 * @param userId User ID to check/create profile for
 * @returns True if profile exists or was created successfully
 */
export async function ensureUserProfile(userId: string): Promise<boolean> {
  try {
    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (existingProfile) {
      return true;
    }
    
    // Create a profile if it doesn't exist
    console.log(`Creating profile for user ID: ${userId}`);
    await prisma.profile.create({
      data: {
        userId,
        profileCreatedAt: new Date()
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return false;
  }
}

/**
 * Parse cookie expiration value into a Date or null
 * Handles various formats: Date objects, timestamp numbers, or strings
 */
function parseCookieExpiration(expires: any): Date | null {
  if (!expires) return null;
  
  try {
    // If it's already a Date object
    if (expires instanceof Date) {
      return expires;
    }
    
    // If it's a number (timestamp)
    if (typeof expires === 'number') {
      return new Date(expires);
    }
    
    // If it's a string representing a date
    if (typeof expires === 'string') {
      // Check if it's a timestamp string
      const timestamp = parseInt(expires, 10);
      if (!isNaN(timestamp)) {
        return new Date(timestamp);
      }
      
      // Try to parse it as a date string
      const date = new Date(expires);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // If we get here, we can't parse it
    console.warn(`Unparseable cookie expiration: ${expires}`);
    return null;
  } catch (error) {
    console.warn(`Error parsing cookie expiration: ${expires}`, error);
    return null;
  }
}

/**
 * Save X cookies to the database for a user
 * Ensures profile exists before saving
 * 
 * @param userId User ID to save cookies for
 * @param cookies Array of cookies to save
 * @returns Number of cookies saved
 */
export async function saveCookiesToDatabase(
  userId: string, 
  cookies: Array<any>
): Promise<number> {
  try {
    // Ensure profile exists before saving cookies
    const profileExists = await ensureUserProfile(userId);
    
    if (!profileExists) {
      throw new Error('Could not create user profile');
    }
    
    // Log cookie format for debugging
    console.log('First cookie sample:', cookies[0]);
    
    // Save each cookie
    let savedCount = 0;
    
    for (const cookie of cookies) {
      // Parse expiration date
      const expiresDate = parseCookieExpiration(cookie.expires);
      
      // Extract cookie properties with safe fallbacks
      const cookieKey = cookie.key || cookie.name || '';
      const cookieValue = cookie.value || '';
      
      if (!cookieKey || !cookieValue) {
        console.warn('Skipping cookie with missing key or value', cookie);
        continue;
      }
      
      // Use upsert to update if exists or create if not
      await prisma.cookie.upsert({
        where: {
          userId_key: {
            userId,
            key: cookieKey
          }
        },
        update: {
          value: cookieValue,
          domain: cookie.domain || '.twitter.com',
          path: cookie.path || '/',
          expires: expiresDate,
          secure: !!cookie.secure,
          httpOnly: !!cookie.httpOnly,
          sameSite: cookie.sameSite || 'Lax'
        },
        create: {
          userId,
          key: cookieKey,
          value: cookieValue,
          domain: cookie.domain || '.twitter.com',
          path: cookie.path || '/',
          expires: expiresDate,
          secure: !!cookie.secure,
          httpOnly: !!cookie.httpOnly,
          sameSite: cookie.sameSite || 'Lax'
        }
      });
      
      savedCount++;
    }
    
    console.log(`Saved ${savedCount} cookies to database for user ${userId}`);
    return savedCount;
  } catch (error) {
    console.error('Error saving cookies to database:', error);
    throw error;
  }
}

/**
 * Increment the custom generations usage count for a user
 * Returns information about remaining generations and if the limit is reached
 * 
 * @param userId User ID to update generations count for
 * @returns Object with generation limit information
 */
export async function incrementCustomGenerations(userId: string): Promise<{ 
  success: boolean;
  limitReached: boolean;
  used: number;
  total: number;
  remaining: number;
}> {
  try {
    console.log(`Incrementing custom generations for user: ${userId}`);
    
    // Ensure profile exists
    await ensureUserProfile(userId);
    
    // Get user profile with plan information
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { plan: true }
    });
    
    console.log(`Profile before increment for user ${userId}:`, profile ? {
      id: profile.userId,
      planId: profile.planId,
      customGenerationsUsed: profile.customGenerationsUsed,
      hasPlan: !!profile.plan,
      planName: profile.plan?.planName,
      maxGenerations: profile.plan?.maxCustomGenerations
    } : 'Profile not found');
    
    if (!profile || !profile.plan) {
      throw new Error('User profile or plan not found');
    }
    
    const currentUsage = profile.customGenerationsUsed;
    const maxAllowed = profile.plan.maxCustomGenerations;
    
    // Check if the user has already reached their limit
    if (currentUsage >= maxAllowed) {
      console.log(`User ${userId} has already reached their generation limit (${currentUsage}/${maxAllowed})`);
      return {
        success: false,
        limitReached: true,
        used: currentUsage,
        total: maxAllowed,
        remaining: 0
      };
    }
    
    // Increment the usage count
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: { customGenerationsUsed: currentUsage + 1 },
      include: { plan: true }
    });
    
    const newUsage = updatedProfile.customGenerationsUsed;
    const remaining = Math.max(0, maxAllowed - newUsage);
    
    console.log(`Incremented generations for user ${userId}: ${currentUsage} -> ${newUsage} (${remaining} remaining)`);
    
    const result = {
      success: true,
      limitReached: newUsage >= maxAllowed,
      used: newUsage,
      total: maxAllowed,
      remaining
    };
    
    console.log(`Increment result for user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error('Error incrementing custom generations:', error);
    throw error;
  }
}

/**
 * Check if a user has available custom generations
 * 
 * @param userId User ID to check generations for
 * @returns Object with generation limit information
 */
export async function checkCustomGenerationsAvailable(userId: string): Promise<{
  available: boolean;
  used: number;
  total: number;
  remaining: number;
}> {
  try {
    console.log(`Checking custom generations for user: ${userId}`);
    
    // Get user profile with plan information
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { plan: true }
    });
    console.log(`Profile data for user ${userId}:`, profile ? {
      id: profile.userId,
      planId: profile.planId,
      customGenerationsUsed: profile.customGenerationsUsed,
      hasPlan: !!profile.plan,
      planName: profile.plan?.planName,
      maxGenerations: profile.plan?.maxCustomGenerations
    } : 'Profile not found');
    
    // Handle case where profile doesn't exist
    if (!profile) {
      console.warn(`Profile not found for user ${userId} when checking generations.`);
      // Return default values indicating no availability
      return {
        available: false,
        used: 0,
        total: 0, 
        remaining: 0
      };
    }

    // Handle case where profile exists but plan is not assigned
    if (!profile.plan) {
      console.warn(`Plan not assigned for user ${userId} when checking generations.`);
      // Return default values indicating no availability due to missing plan
      return {
        available: false,
        used: profile.customGenerationsUsed, // Reflect actual usage if tracked
        total: 0, // No plan means total is effectively 0
        remaining: 0
      };
    }
    
    // If profile and plan exist, proceed with calculation
    const currentUsage = profile.customGenerationsUsed;
    const maxAllowed = profile.plan.maxCustomGenerations;
    const remaining = Math.max(0, maxAllowed - currentUsage);
    
    const result = {
      available: currentUsage < maxAllowed,
      used: currentUsage,
      total: maxAllowed,
      remaining
    };
    
    console.log(`Generations availability result for user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error('Error checking custom generations availability:', error);
    // Return default values on unexpected errors
    return {
      available: false,
      used: 0,
      total: 0,
      remaining: 0
    };
  }
} 