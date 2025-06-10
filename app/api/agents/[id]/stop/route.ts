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

    // Check if agent is already stopped
    if (agent.status === AgentStatus.stopped) {
      return NextResponse.json({ 
        error: 'Agent is already stopped',
        agent 
      }, { status: 400 });
    }

    // For serverless deployment, we just update the status
    const stoppedAgent = await agentService.updateAgentForUser(userId, agentId, {
      status: AgentStatus.stopped,
      endTime: new Date()
    });

    console.log(`Agent ${agentId} stopped successfully for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Agent stopped successfully',
      agent: stoppedAgent
    });

  } catch (error) {
    console.error('Agent stop error:', error);
    return NextResponse.json({
      error: 'Failed to stop agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 