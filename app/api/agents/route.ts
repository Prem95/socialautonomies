import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { AgentStatus } from '@prisma/client';
import { withSecurity, handleError } from '../middleware/security';
import { createAgentSchema } from '../schemas/validation';

export const GET = withSecurity(undefined, false)(async (request: NextRequest, context, user) => {
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all agents for the user, selecting specific fields and including Twitter Auth info
    const agentsData = await prisma.agent.findMany({
      where: { userId: user.userId },
      select: {
        agentId: true,
        userId: true,
        name: true,
        goal: true,
        brand: true, // Keep Json fields if used by frontend
        specialHooks: true, // Keep Json fields if used by frontend
        language: true,
        exampleUserQuestion: true,
        exampleAgentReply: true,
        status: true,
        startTime: true,
        endTime: true,
        schedule: true,
        autoReply: true,
        maxDailyTweets: true,
        maxDailyReplies: true,
        autoTweetEnabled: true,
        autoTweetFrequencyHours: true,
        autoTweetCount: true,
        lastAutoTweetTime: true,

        twitterAuth: {
          select: {
            twitterScreenName: true, // Select only the screen name
          }
        }
      }
    });

    // Map the data to include the screen name directly and the connection status
    const agentsForClient = agentsData.map(agent => ({
      ...agent,
      // Map twitterScreenName to twitterUsername for frontend compatibility if needed
      // If frontend expects twitterScreenName, you can skip this mapping
      twitterUsername: agent.twitterAuth?.twitterScreenName ?? null,
      // Add the boolean flag for easier frontend logic
      isTwitterConnected: !!agent.twitterAuth?.twitterScreenName,
      // Remove the nested twitterAuth object before sending to client (optional, good practice)
      twitterAuth: undefined,
    }));

    return NextResponse.json(agentsForClient);

  } catch (error) {
    return handleError(error, 'Agents GET');
  }
});

export const POST = withSecurity(createAgentSchema, false)(async (request: NextRequest, context, user, validatedData) => {
  try {
    if (!user || !validatedData) {
      return NextResponse.json({ error: 'Unauthorized or invalid data' }, { status: 401 });
    }

    // Get the profile to check if exists and has an active plan
    const profile = await prisma.profile.findUnique({
      where: { userId: user.userId },
      include: { plan: true }
    });

    if (!profile) {
      return NextResponse.json(
        { error: `Profile not found. Please set up your profile first.` },
        { status: 404 }
      );
    }

    if (!profile.planId || !profile.plan) { // Check plan object exists too
      return NextResponse.json(
        { error: 'User does not have an active plan' },
        { status: 400 }
      );
    }

    // Check if user has reached the agent limit
    const agentCount = await prisma.agent.count({
      where: { userId: user.userId }
    });

    // Use nullish coalescing for safety, though plan should exist based on above check
    const maxAgents = profile.plan?.maxAgents ?? 0;

    if (agentCount >= maxAgents) {
      return NextResponse.json(
        { error: `Agent limit reached: ${agentCount}/${maxAgents}. Upgrade plan to create more agents.` },
        { status: 400 }
      );
    }

    // Create the agent
    const newAgent = await prisma.agent.create({
      data: {
        userId: user.userId,
        name: validatedData.name,
        goal: validatedData.goal,
        language: validatedData.language,
        brand: validatedData.brand || {},
        specialHooks: validatedData.specialHooks || {},
        status: AgentStatus.stopped // Use enum value
      },
      // Select only the fields needed for the response
      select: {
        agentId: true,
        name: true,
        status: true,
        // Add other fields if the frontend needs them immediately after creation
      }
    });

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    return handleError(error, 'Agents POST');
  }
}); 