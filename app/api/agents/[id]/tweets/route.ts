import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { requireAuth } from '../../../utils/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    
    // Get agent by ID
    const agentId = params.id;
    
    // Find the agent with tweets
    const agent = await prisma.agent.findUnique({
      where: { 
        agentId,
        userId // Only return if it belongs to the authenticated user
      },
      include: {
        tweets: {
          orderBy: { postTime: 'desc' }
        }
      }
    });
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent with ID ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // Return just the tweets array
    return NextResponse.json(agent.tweets);
  } catch (error) {
    console.error('Error fetching tweets:', error);
    
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