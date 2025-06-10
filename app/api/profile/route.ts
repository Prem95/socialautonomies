import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { getServerUser } from '@/lib/supabase';

// Helper function to handle BigInt serialization
function serializeData(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    )
  );
}

export async function POST(request: Request) {
  try {
    // Get authenticated user using the secure method
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId }
    });
    
    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 400 }
      );
    }
    
    // Create new profile without any plan (plan will be assigned after payment)
    const newProfile = await prisma.profile.create({
      data: {
        userId,
        planId: null, // No plan until payment is completed
        profileCreatedAt: new Date()
      }
    });
    
    return NextResponse.json(serializeData(newProfile), { status: 201 });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get authenticated user using the secure method
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        userId: true,
        planId: true,
        profileCreatedAt: true,
        // Remove sensitive Stripe data - only keep what UI needs
        customGenerationsUsed: true,
        tweetsUsed: true,
        repliesUsed: true,
        
        // Essential billing information for UI display (Monthly only)
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
    });
    
    // If no profile exists, return a default empty profile structure
    if (!profile) {
      const responseData = {
        userId,
        planId: null,
        profileCreatedAt: null,
        // Remove sensitive Stripe data - only keep what UI needs
        customGenerationsUsed: 0,
        tweetsUsed: 0,
        repliesUsed: 0,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: null,
        usage: {
          agents: {
            current: 0,
            max: 0,
            available: 0,
            percentage: 0
          },
          tweetsPerAgent: 0
        }
      };
      
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'Vary': 'Cookie'
        }
      });
    }
    
    // Get current agent count
    const agentCount = await prisma.agent.count({
      where: { userId }
    });
    
    // Calculate usage limits
    const maxAgents = profile.plan?.maxAgents || 0;
    const maxTweetsPerAgent = profile.plan?.maxTweetsPerAgent || 0;
    
    // Prepare the response data
    const responseData = {
      ...serializeData(profile),
      usage: {
        agents: {
          current: agentCount,
          max: maxAgents,
          available: Math.max(0, maxAgents - agentCount),
          percentage: maxAgents > 0 ? Math.min(100, Math.round((agentCount / maxAgents) * 100)) : 0
        },
        tweetsPerAgent: maxTweetsPerAgent
      }
    };
    
    // Return enhanced profile data with proper caching headers
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 