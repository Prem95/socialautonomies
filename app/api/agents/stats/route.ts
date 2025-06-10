import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { requireAuth } from '../../utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    
    // Get total number of agents
    const totalAgents = await prisma.agent.count({
      where: { userId }
    });
    
    // Get number of active (running) agents
    const activeAgents = await prisma.agent.count({
      where: { 
        userId,
        status: 'running'
      }
    });
    
    // Get total tweets count for all agents
    const tweets = await prisma.tweet.findMany({
      where: {
        agent: {
          userId
        }
      }
    });
    
    const totalTweets = tweets.length;
    
    // Get the user's profile with plan to determine agent quota
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { plan: true }
    });
    
    // Get max agents allowed by the plan
    const maxAgentsAllowed = profile?.plan?.maxAgents || 0;
    
    // Calculate total uptime (simplified for now)
    const uptime = "0h 0m";

    const engagementRate = "0%";
    const growthRate = "0%";
    
    return NextResponse.json({
      totalAgents,
      maxAgentsAllowed,
      activeAgents,
      totalTweets,
      uptime,
      engagementRate,
      growthRate
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}