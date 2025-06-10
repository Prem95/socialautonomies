import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { z } from 'zod';
import { withSecurity, handleError } from '../../middleware/security';
import { updateAgentSchema, agentIdParamSchema, validatePathParams } from '../../schemas/validation';
import { requireAuth } from '../../utils/auth';

export const GET = withSecurity(undefined, false)(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate path parameters
    const paramValidation = validatePathParams(agentIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error },
        { status: 400 }
      );
    }

    const { id: agentId } = paramValidation.data;
    
    // Find the agent with tweets
    const agent = await prisma.agent.findUnique({
      where: { 
        agentId,
        userId: user.userId // Only return if it belongs to the authenticated user
      },
      include: {
        tweets: {
          orderBy: { postTime: 'desc' },
          take: 10
        }
      }
    });
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent with ID ${agentId} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(agent);
  } catch (error) {
    return handleError(error, 'Agent GET');
  }
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(request);
    const agentId = params.id;
    const json = await request.json();
    
    // Log the request body for debugging
    console.log("PUT /api/agents/[id] - Request body:", JSON.stringify(json, null, 2));

    // Find agent to ensure it exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: {
        agentId: agentId,
        userId: userId, // Ensure user owns the agent
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found or permission denied" }, { status: 404 });
    }
    
    // Log the update operation for debugging
    console.log(`Updating agent ${agentId} with data:`, 
      json.name ? `name="${json.name}"` : "",
      json.goal ? `goal="${json.goal.substring(0, 50)}..."` : "",
      json.language ? `language="${json.language}"` : "",
      json.brand ? `brand updated` : "",
      json.specialHooks ? `specialHooks updated` : "",
      json.autoTweetEnabled !== undefined ? `enabled=${json.autoTweetEnabled}` : "(unchanged)",
      json.autoTweetFrequencyHours !== undefined ? `frequency=${json.autoTweetFrequencyHours}h` : "",
      json.autoTweetCount !== undefined ? `count=${json.autoTweetCount}` : ""
    );

    // Update the agent data
    const updatedAgent = await prisma.agent.update({
      where: { agentId: agentId },
      data: {
        // Basic fields - always update if provided
        name: json.name !== undefined ? json.name : agent.name,
        goal: json.goal !== undefined ? json.goal : agent.goal,
        language: json.language !== undefined ? json.language : agent.language,
        
        // Brand and specialHooks - update if provided
        ...(json.brand !== undefined && { brand: json.brand }),
        ...(json.specialHooks !== undefined && { specialHooks: json.specialHooks }),
        
        // Auto-tweet configuration - only update if provided
        ...(json.autoTweetEnabled !== undefined && { 
          autoTweetEnabled: json.autoTweetEnabled 
        }),
        ...(json.autoTweetFrequencyHours !== undefined && { 
          autoTweetFrequencyHours: json.autoTweetFrequencyHours 
        }),
        ...(json.autoTweetCount !== undefined && { 
          autoTweetCount: json.autoTweetCount 
        }),
        
        // Auto-engage configuration - only update if provided
        ...(json.autoEngageEnabled !== undefined && { 
          autoEngageEnabled: json.autoEngageEnabled 
        }),
        ...(json.autoEngageFrequencyHours !== undefined && { 
          autoEngageFrequencyHours: json.autoEngageFrequencyHours 
        }),
        ...(json.autoEngageMaxReplies !== undefined && { 
          autoEngageMaxReplies: json.autoEngageMaxReplies 
        }),
        ...(json.autoEngageMinScore !== undefined && { 
          autoEngageMinScore: json.autoEngageMinScore 
        }),
        ...(json.autoEngageAutoReply !== undefined && { 
          autoEngageAutoReply: json.autoEngageAutoReply 
        }),
      },
      // Include relations if needed by the frontend after update
      include: { twitterAuth: { select: { twitterScreenName: true } } }
    });

     // --- Re-map the result for the client if necessary ---
    // This ensures consistency with the GET endpoint's structure
    const agentForClient = {
      ...updatedAgent,
      twitterUsername: (updatedAgent as any).twitterAuth?.twitterScreenName ?? null,
      isTwitterConnected: !!(updatedAgent as any).twitterAuth?.twitterScreenName,
      twitterAuth: undefined,
    };
    // -----------------------------------------------------

    return NextResponse.json({
        message: `Agent "${updatedAgent.name}" updated successfully.`,
        agent: agentForClient // Return the mapped data
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("Error updating agent:", error);
    return NextResponse.json({ error: "Failed to update agent." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(request);
    const agentId = params.id;
    const json = await request.json();

    // Log the request body for debugging
    console.log("PATCH /api/agents/[id] - Request body:", JSON.stringify(json, null, 2));

    // Find agent to ensure it exists and belongs to user
    // ADD SELECT to prevent fetching non-existent columns
    const agent = await prisma.agent.findUnique({
      where: {
        agentId: agentId,
        userId: userId, // Ensure user owns the agent
      },
      select: { // Select only necessary fields
        agentId: true,
        userId: true,
        // Select fields if needed for complex validation or fallback logic (not strictly needed here)
        // name: true,
        // goal: true,
        // language: true,
      }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found or permission denied" }, { status: 404 });
    }

    // Log the update operation for debugging - use new interval field if present
    console.log(`Updating agent ${agentId} with data:`,
      Object.entries(json).map(([key, value]) => `${key}=${value}`).join(', ')
    );

    // Update the agent data
    const updatedAgent = await prisma.agent.update({
      where: { agentId: agentId },
      data: {
        // Basic fields - only update if provided in PATCH request
        ...(json.name !== undefined && { name: json.name }),
        ...(json.goal !== undefined && { goal: json.goal }),
        ...(json.language !== undefined && { language: json.language }),

        // Auto-tweet configuration - update based on new schema
        ...(json.autoTweetEnabled !== undefined && {
          autoTweetEnabled: json.autoTweetEnabled
        }),
        ...(json.autoTweetFrequencyHours !== undefined && {
          autoTweetFrequencyHours: json.autoTweetFrequencyHours
        }),
        ...(json.autoTweetCount !== undefined && {
            // Ensure count is null if disabled
            autoTweetCount: json.autoTweetEnabled === false ? null : json.autoTweetCount
        }),
        
        // Auto-engage configuration - update based on request
        ...(json.autoEngageEnabled !== undefined && {
          autoEngageEnabled: json.autoEngageEnabled
        }),
        ...(json.autoEngageFrequencyHours !== undefined && {
          autoEngageFrequencyHours: json.autoEngageFrequencyHours
        }),
        ...(json.autoEngageMaxReplies !== undefined && {
          autoEngageMaxReplies: json.autoEngageMaxReplies
        }),
        ...(json.autoEngageMinScore !== undefined && {
          autoEngageMinScore: json.autoEngageMinScore
        }),
        ...(json.autoEngageAutoReply !== undefined && {
          autoEngageAutoReply: json.autoEngageAutoReply
        }),
      },
      // Select fields needed for the response, including the count
      select: {
          agentId: true,
          name: true,
          goal: true,
          language: true,
          status: true,
          autoTweetEnabled: true,
          autoTweetFrequencyHours: true,
          autoTweetCount: true, // Include count in response
          lastAutoTweetTime: true,
          autoEngageEnabled: true,
          autoEngageFrequencyHours: true,
          autoEngageMaxReplies: true,
          autoEngageMinScore: true,
          autoEngageAutoReply: true,
          lastAutoEngageTime: true,
          twitterAuth: { select: { twitterScreenName: true } }
      }
    });

     // --- Re-map the result for the client if necessary ---
    const agentForClient = {
      ...updatedAgent,
      twitterUsername: updatedAgent.twitterAuth?.twitterScreenName ?? null,
      isTwitterConnected: !!updatedAgent.twitterAuth?.twitterScreenName,
      twitterAuth: undefined, // Don't send the nested object back
    };
    // -----------------------------------------------------\

    return NextResponse.json({
        message: `Agent "${updatedAgent.name}" updated successfully.`,
        agent: agentForClient // Return the mapped data
    });

  } catch (error) {
    // Log Prisma errors specifically
    if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
       console.error('Prisma Error updating agent:', (error as any).code, (error as any).meta);
    } else if (error instanceof z.ZodError) {
      console.error('Validation Error updating agent:', error.issues);
      return NextResponse.json({ error: error.issues }, { status: 400 });
    } else if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
       console.error("Error updating agent:", error);
    }

    return NextResponse.json({ error: "Failed to update agent." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    
    const agentId = params.id;
    
    // Check if agent exists and belongs to user
    const agent = await prisma.agent.findUnique({
      where: { 
        agentId,
        userId
      }
    });
    
    if (!agent) {
      return NextResponse.json(
        { error: `Agent with ID ${agentId} not found` },
        { status: 404 }
      );
    }
    
    // If agent is running, stop it first
    if (agent.status === 'running') {
      await prisma.agent.update({
        where: { agentId },
        data: { 
          status: 'stopped',
          endTime: new Date()
        }
      });
    }
    
    // Delete the agent
    const deletedAgent = await prisma.agent.delete({
      where: { agentId }
    });
    
    return NextResponse.json(deletedAgent);
  } catch (error) {
    console.error('Error deleting agent:', error);
    
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