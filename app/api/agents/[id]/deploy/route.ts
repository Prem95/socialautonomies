import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/app/db/services';
import { requireAuth } from '@/app/api/utils/auth';
import { AgentStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;

    // Validate agent ownership
    const agent = await agentService.getAgentByIdForUser(userId, agentId);

    // Check if agent is already running
    if (agent.status === AgentStatus.running) {
      return NextResponse.json({ 
        error: 'Agent is already running',
        agent 
      }, { status: 400 });
    }

    // Validate agent configuration
    if (!agent.name?.trim()) {
      return NextResponse.json({ 
        error: 'Agent name is required' 
      }, { status: 400 });
    }

    if (!agent.goal?.trim()) {
      return NextResponse.json({ 
        error: 'Agent goal is required' 
      }, { status: 400 });
    }

    // For serverless deployment, we just update the status
    // The actual scheduling is handled by the cron jobs
    const deployedAgent = await agentService.updateAgentForUser(userId, agentId, {
      status: AgentStatus.running,
      startTime: new Date()
    });

    console.log(`Agent ${agentId} deployed successfully for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Agent deployed successfully',
      agent: deployedAgent
    });

  } catch (error) {
    console.error('Agent deployment error:', error);
    return NextResponse.json({
      error: 'Failed to deploy agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 