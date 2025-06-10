import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { requireAuth } from '../../utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    
    // Get the profile with plan details
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { plan: true }
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    if (!profile.planId) {
      return NextResponse.json(
        { error: 'User does not have an active plan' },
        { status: 400 }
      );
    }
    
    // Count agents for the user
    const agentCount = await prisma.agent.count({
      where: { userId }
    });
    
    // Get max agents from plan
    const maxAgents = profile.plan?.maxAgents || 0;
    
    // Calculate remaining and whether user can create more
    const remaining = maxAgents - agentCount;
    const canCreate = agentCount < maxAgents;
    
    return NextResponse.json({
      used: agentCount,
      limit: maxAgents,
      remaining,
      canCreate
    });
  } catch (error) {
    console.error('Error getting agent quota:', error);
    
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