import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/app/db/services';
import { requireAuth } from '@/app/api/utils/auth';
import { AgentStatus } from '@prisma/client';
import prisma from '@/app/db/utils/dbClient';
import { TwitterApi as CustomTwitterApiWrapper } from '../../../twitter-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;

    // Get agent with Twitter auth information and validate ownership
    const agent = await agentService.getAgentWithTwitterAuthForUser(userId, agentId);

    // Check if agent is already running
    if (agent.status === AgentStatus.running) {
      return NextResponse.json({ 
        error: 'Agent is already running',
        agent 
      }, { status: 400 });
    }

    // Check for valid Twitter cookies
    const validCookies = await prisma.cookie.findMany({
      where: {
        userId,
        OR: [
          { expires: null },
          { expires: { gt: new Date() } }
        ]
      }
    });

    if (!validCookies || validCookies.length === 0) {
      return NextResponse.json(
        {
          error: 'CREDENTIALS_REQUIRED',
          details: 'No valid cookies found. Please add your Twitter cookies.'
        },
        { status: 428 }
      );
    }

    // Validate cookies by testing login
    try {
      const cookieStrings = validCookies.map(cookie => 
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      const api = new CustomTwitterApiWrapper({
        cookiesPath: './data/cookies.json',
        debug: false,
      }); 

      const scraper = api.getScraper();
      await scraper.setCookies(cookieStrings);
      
      const isLoggedIn = await scraper.isLoggedIn();
      
      if (!isLoggedIn) {
        return NextResponse.json(
          {
            error: 'CREDENTIALS_REQUIRED',
            details: 'Stored cookies appear to be invalid or expired.'
          },
          { status: 428 }
        );
      }

    } catch (validationError: any) {
      console.error(`Cookie validation failed for agent ${agentId}:`, validationError?.data || validationError);
      return NextResponse.json(
        {
          error: 'CREDENTIALS_REQUIRED',
          details: 'Stored cookies appear to be invalid or expired.'
        },
        { status: 428 }
      );
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

    console.log(`[Validate-Deploy Route] Successfully validated and deployed agent ${agentId} in serverless mode`);

    return NextResponse.json({
      success: true,
      message: `Agent ${deployedAgent.name} deployed successfully using stored session.`,
      agent: deployedAgent
    });

  } catch (error) {
    console.error(`Validate-deploy error for agent ${params.id}:`, error);
    return NextResponse.json({
      error: 'Failed to validate and deploy agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
