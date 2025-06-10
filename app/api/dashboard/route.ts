import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { getServerUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper function to handle BigInt serialization
function serializeData(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    )
  );
}

interface DashboardResponse {
  // Main profile data (compatible with /api/profile)
  profile: {
    userId: string;
    planId: string | null;
    profileCreatedAt: string;
    customGenerationsUsed: number;
    tweetsUsed: number;
    repliesUsed: number;
    subscriptionStatus: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    plan: {
      planId: string;
      planName: string;
      maxAgents: number;
      maxTweetsPerAgent: number;
      maxCustomGenerations: number;
      maxRepliesPerAgent: number;
      price: string;
    } | null;
    // Include legacy usage field for backward compatibility
    usage: {
      agents: {
        current: number;
        max: number;
        available: number;
        percentage: number;
      };
      tweetsPerAgent: number;
    };
  };
  
  // Agent quota data (compatible with /api/agents/quota)
  quota: {
    used: number;
    limit: number;
    remaining: number;
    canCreate: boolean;
  };
  
  // Agent status data (compatible with /api/agents/status)
  usage: {
    agents: {
      current: number;
      max: number;
      available: number;
      percentage: number;
      active: number;
    };
    tweetsPerAgent: number;
    activity: {
      totalTweets: number;
      totalReplies: number;
      recentTweets: number;
      autoTweetEnabled: number;
      autoEngageEnabled: number;
    };
  };
  
  agents: Array<{
    agentId: string;
    name: string;
    status: string;
    autoTweetEnabled: boolean;
    autoEngageEnabled: boolean;
    lastAutoTweetTime: string | null;
    lastAutoEngageTime: string | null;
    stats: {
      tweets: number;
      replies: number;
    };
  }>;
  
  timestamp: string;
}

export async function GET() {
  try {
    // Get authenticated user
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Single optimized query to get all necessary data
    const [profile, agents] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          userId: true,
          planId: true,
          profileCreatedAt: true,
          customGenerationsUsed: true,
          tweetsUsed: true,
          repliesUsed: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          trialStart: true,
          trialEnd: true,
          lastUsageReset: true,
          plan: {
            select: {
              planId: true,
              planName: true,
              maxAgents: true,
              maxTweetsPerAgent: true,
              maxCustomGenerations: true,
              maxRepliesPerAgent: true,
              price: true
            }
          }
        }
      }),
      prisma.agent.findMany({
        where: { userId },
        select: {
          agentId: true,
          name: true,
          status: true,
          autoTweetEnabled: true,
          autoEngageEnabled: true,
          lastAutoTweetTime: true,
          lastAutoEngageTime: true,
          _count: {
            select: {
              tweets: true,
              replies: true
            }
          }
        }
      })
    ]);

    // If no profile exists, return a default empty structure
    if (!profile) {
      const responseData: DashboardResponse = {
        profile: {
          userId,
          planId: null,
          profileCreatedAt: new Date().toISOString(),
          customGenerationsUsed: 0,
          tweetsUsed: 0,
          repliesUsed: 0,
          subscriptionStatus: 'inactive',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          plan: null,
          usage: {
            agents: { current: 0, max: 0, available: 0, percentage: 0 },
            tweetsPerAgent: 0
          }
        },
        quota: { used: 0, limit: 0, remaining: 0, canCreate: false },
        usage: {
          agents: { current: 0, max: 0, available: 0, percentage: 0, active: 0 },
          tweetsPerAgent: 0,
          activity: {
            totalTweets: 0,
            totalReplies: 0,
            recentTweets: 0,
            autoTweetEnabled: 0,
            autoEngageEnabled: 0
          }
        },
        agents: [],
        timestamp: new Date().toISOString()
      };

      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'private, max-age=60', // 1 minute cache
        }
      });
    }

    // Calculate comprehensive quota and usage metrics
    const maxAgents = profile.plan?.maxAgents || 0;
    const maxTweetsPerAgent = profile.plan?.maxTweetsPerAgent || 0;
    const maxCustomGenerations = profile.plan?.maxCustomGenerations || 0;
    const maxRepliesPerAgent = profile.plan?.maxRepliesPerAgent || 0;
    
    const agentCount = agents.length;
    const canCreateAgent = agentCount < maxAgents;

    // Aggregate agent activity
    const totalTweets = agents.reduce((sum, agent) => sum + agent._count.tweets, 0);
    const totalReplies = agents.reduce((sum, agent) => sum + agent._count.replies, 0);
    const activeAgents = agents.filter(agent => agent.status === 'running').length;
    const autoTweetEnabled = agents.filter(agent => agent.autoTweetEnabled).length;
    const autoEngageEnabled = agents.filter(agent => agent.autoEngageEnabled).length;

    // Calculate recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.tweet.count({
      where: {
        agentId: { in: agents.map(a => a.agentId) },
        postTime: { gte: yesterday }
      }
    });

    const responseData: DashboardResponse = {
      profile: {
        userId: profile.userId,
        planId: profile.planId?.toString() || null,
        profileCreatedAt: profile.profileCreatedAt.toISOString(),
        customGenerationsUsed: profile.customGenerationsUsed,
        tweetsUsed: profile.tweetsUsed,
        repliesUsed: profile.repliesUsed,
        subscriptionStatus: profile.subscriptionStatus,
        currentPeriodEnd: profile.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: profile.cancelAtPeriodEnd,
        plan: profile.plan ? {
          planId: profile.plan.planId.toString(),
          planName: profile.plan.planName,
          maxAgents: profile.plan.maxAgents,
          maxTweetsPerAgent: profile.plan.maxTweetsPerAgent,
          maxCustomGenerations: profile.plan.maxCustomGenerations,
          maxRepliesPerAgent: profile.plan.maxRepliesPerAgent,
          price: profile.plan.price.toString()
        } : null,
        // Include legacy usage field for backward compatibility with profile components
        usage: {
          agents: {
            current: agentCount,
            max: maxAgents,
            available: Math.max(0, maxAgents - agentCount),
            percentage: maxAgents > 0 ? Math.min(100, Math.round((agentCount / maxAgents) * 100)) : 0
          },
          tweetsPerAgent: maxTweetsPerAgent
        }
      },
      
      // Agent quota data (compatible with /api/agents/quota)
      quota: {
        used: agentCount,
        limit: maxAgents,
        remaining: Math.max(0, maxAgents - agentCount),
        canCreate: canCreateAgent
      },
      
      // Agent status data (compatible with /api/agents/status)
      usage: {
        agents: {
          current: agentCount,
          max: maxAgents,
          available: Math.max(0, maxAgents - agentCount),
          percentage: maxAgents > 0 ? Math.min(100, Math.round((agentCount / maxAgents) * 100)) : 0,
          active: activeAgents
        },
        tweetsPerAgent: maxTweetsPerAgent,
        activity: {
          totalTweets,
          totalReplies,
          recentTweets: recentActivity,
          autoTweetEnabled,
          autoEngageEnabled
        }
      },
      
      agents: agents.map(agent => ({
        agentId: agent.agentId,
        name: agent.name,
        status: agent.status,
        autoTweetEnabled: agent.autoTweetEnabled,
        autoEngageEnabled: agent.autoEngageEnabled,
        lastAutoTweetTime: agent.lastAutoTweetTime?.toISOString() || null,
        lastAutoEngageTime: agent.lastAutoEngageTime?.toISOString() || null,
        stats: {
          tweets: agent._count.tweets,
          replies: agent._count.replies
        }
      })),
      
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(serializeData(responseData), {
      headers: {
        'Cache-Control': 'private, max-age=60', // 1 minute cache for performance
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 