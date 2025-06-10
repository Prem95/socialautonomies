import { NextResponse } from 'next/server';
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
          // Remove sensitive Stripe data from query - only select what UI needs
          customGenerationsUsed: true,
          tweetsUsed: true,
          
          // Essential billing information for UI display
          subscriptionStatus: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          
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
      const responseData = {
        profile: {
          userId,
          planId: null,
          customGenerationsUsed: 0,
          tweetsUsed: 0,
          subscriptionStatus: null,
          plan: null
        },
        usage: {
          agents: {
            current: 0,
            max: 0,
            available: 0,
            percentage: 0,
            active: 0
          },
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
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Expires': '0',
          'Pragma': 'no-cache'
        }
      });
    }

    // Calculate usage metrics
    const maxAgents = profile.plan?.maxAgents || 0;
    const maxTweetsPerAgent = profile.plan?.maxTweetsPerAgent || 0;
    const agentCount = agents.length;

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

    const responseData = {
      profile: {
        userId: profile.userId,
        planId: profile.planId?.toString() || null,
        customGenerationsUsed: profile.customGenerationsUsed,
        tweetsUsed: profile.tweetsUsed,
        subscriptionStatus: profile.subscriptionStatus,
        plan: profile.plan
      },
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
        lastAutoTweetTime: agent.lastAutoTweetTime,
        lastAutoEngageTime: agent.lastAutoEngageTime,
        stats: {
          tweets: agent._count.tweets,
          replies: agent._count.replies
        }
      })),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(serializeData(responseData), {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Expires': '0',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 