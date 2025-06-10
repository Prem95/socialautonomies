import prisma from './dbClient';

/**
 * Increment the tweet usage counter for a user
 * @param userId - The user ID to increment usage for
 * @returns Promise<void>
 */
export async function incrementTweetUsage(userId: string): Promise<void> {
  try {
    await prisma.profile.update({
      where: { userId },
      data: {
        tweetsUsed: {
          increment: 1
        }
      }
    });
    console.log(`Incremented tweet usage for user ${userId}`);
  } catch (error) {
    console.error('Error incrementing tweet usage:', error);
    throw error;
  }
}

/**
 * Check if user can post more tweets based on their plan limit
 * @param userId - The user ID to check
 * @returns Promise<{ canPost: boolean, current: number, limit: number }>
 */
export async function checkTweetLimit(userId: string): Promise<{
  canPost: boolean;
  current: number;
  limit: number;
  remaining: number;
}> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        plan: {
          select: {
            maxTweetsPerAgent: true
          }
        }
      }
    });

    if (!profile || !profile.plan) {
      throw new Error('User profile or plan not found');
    }

    const current = profile.tweetsUsed;
    const limit = profile.plan.maxTweetsPerAgent;
    const remaining = Math.max(0, limit - current);
    const canPost = current < limit;

    return {
      canPost,
      current,
      limit,
      remaining
    };
  } catch (error) {
    console.error('Error checking tweet limit:', error);
    throw error;
  }
}

/**
 * Reset tweet usage counter (useful for monthly resets if needed)
 * @param userId - The user ID to reset usage for
 * @returns Promise<void>
 */
export async function resetTweetUsage(userId: string): Promise<void> {
  try {
    await prisma.profile.update({
      where: { userId },
      data: {
        tweetsUsed: 0
      }
    });
    console.log(`Reset tweet usage for user ${userId}`);
  } catch (error) {
    console.error('Error resetting tweet usage:', error);
    throw error;
  }
}

/**
 * Get current tweet usage stats for a user
 * @param userId - The user ID to get stats for
 * @returns Promise<{ used: number, limit: number, remaining: number }>
 */
export async function getTweetUsageStats(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        plan: {
          select: {
            maxTweetsPerAgent: true
          }
        }
      }
    });

    if (!profile || !profile.plan) {
      throw new Error('User profile or plan not found');
    }

    const used = profile.tweetsUsed;
    const limit = profile.plan.maxTweetsPerAgent;
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? (used / limit) * 100 : 0;

    return {
      used,
      limit,
      remaining,
      percentage
    };
  } catch (error) {
    console.error('Error getting tweet usage stats:', error);
    throw error;
  }
}

/**
 * Get current reply usage stats for a user
 * @param userId - The user ID to get stats for
 * @returns Promise<{ used: number, limit: number, remaining: number, percentage: number }>
 */
export async function getReplyUsageStats(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}> {
  try {
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
      throw new Error('User profile or plan not found');
    }

    const used = profile.repliesUsed;
    const limit = profile.plan.maxRepliesPerAgent;
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? (used / limit) * 100 : 0;

    return {
      used,
      limit,
      remaining,
      percentage
    };
  } catch (error) {
    console.error('Error getting reply usage stats:', error);
    throw error;
  }
}

/**
 * Increment reply usage for a user
 * @param userId - The user ID to increment usage for
 * @param count - The number of replies to increment (default: 1)
 * @returns Promise<{ success: boolean, newUsage: number, limit: number }>
 */
export async function incrementReplyUsage(userId: string, count: number = 1): Promise<{
  success: boolean;
  newUsage: number;
  limit: number;
  remaining: number;
}> {
  try {
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
      throw new Error('User profile or plan not found');
    }

    const newUsage = profile.repliesUsed + count;
    const limit = profile.plan.maxRepliesPerAgent;

    // Update the usage
    await prisma.profile.update({
      where: { userId },
      data: {
        repliesUsed: newUsage
      }
    });

    return {
      success: true,
      newUsage,
      limit,
      remaining: Math.max(0, limit - newUsage)
    };
  } catch (error) {
    console.error('Error incrementing reply usage:', error);
    throw error;
  }
}

/**
 * Check if user can post replies (within their monthly limit)
 * @param userId - The user ID to check
 * @param requestedCount - The number of replies they want to post (default: 1)
 * @returns Promise<{ canPost: boolean, reason?: string, usage: UsageStats }>
 */
export async function canPostReplies(userId: string, requestedCount: number = 1): Promise<{
  canPost: boolean;
  reason?: string;
  usage: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}> {
  try {
    const usage = await getReplyUsageStats(userId);
    
    if (usage.remaining >= requestedCount) {
      return {
        canPost: true,
        usage
      };
    } else {
      return {
        canPost: false,
        reason: `You've reached your monthly reply limit of ${usage.limit}. Upgrade to the Standard plan for 200 replies/month.`,
        usage
      };
    }
  } catch (error) {
    console.error('Error checking reply posting ability:', error);
    return {
      canPost: false,
      reason: 'Error checking usage limits',
      usage: { used: 0, limit: 0, remaining: 0, percentage: 0 }
    };
  }
} 