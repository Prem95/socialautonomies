/**
 * Next.js API Route: Generate Tweet
 * 
 * Endpoint for generating tweets using agent personalities
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, handleError } from '@/app/api/middleware/security';
import { validatePathParams, agentIdParamSchema } from '../../../schemas/validation';
import { incrementCustomGenerations, checkCustomGenerationsAvailable } from '@/app/api/utils/profile-service';
import llmService from '@/app/api/llm-service';
import { agentTweetService } from '@/app/api/agent-tweet-service';
import prisma from '@/app/db/utils/dbClient';

// Add this to make the route dynamic and not static
export const dynamic = 'force-dynamic';

interface GenerateTweetRequestBody {
  context?: string;
  llmProvider?: "openrouter";
  post?: boolean;
  text?: string;
  url?: string;
  xAccountToTag?: string;
  isRegeneration?: boolean;
}

export const POST = withSecurity(undefined, false)(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  const agentId = params.id;
  const userId = user?.userId;

  try {
    // Validate path parameters
    const paramValidation = validatePathParams(agentIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error },
        { status: 400 }
      );
    }

    // Parse request body
    const body: GenerateTweetRequestBody = await request.json();
    const { 
      context, 
      llmProvider, 
      post = false, 
      text, 
      url, 
      xAccountToTag, 
      isRegeneration = false 
    } = body;

    console.log('Generation request:', {
      isRegeneration,
      userId,
      agentId,
      post,
      context: context || 'none',
      url: url || 'none',
      xAccountToTag: xAccountToTag || 'none'
    });

    // Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: {
        agentId,
        userId
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found or access denied" },
        { status: 404 }
      );
    }

    // If we're posting an existing text, use the agentTweetService
    if (post && text) {
      const result = await agentTweetService.postTweet({
        agentId,
        userId,
        text
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to post tweet' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Tweet posted successfully',
        tweet: result.tweet
      }, { status: 201 });
    }

    // If we're generating a new tweet (not posting an existing one),
    // AND this is a regeneration (not the first generation),
    // check if the user has remaining generations
    if (!post && isRegeneration) {
      const generationsAvailable = await checkCustomGenerationsAvailable(userId);
      
      if (!generationsAvailable.available) {
        return NextResponse.json(
          { 
            error: "Custom generation limit reached",
            generationsInfo: generationsAvailable
          },
          { status: 403 }
        );
      }
    }

    // Generate the tweet using LLM service
    const generationResult = await llmService.generateAgentTweet(agentId, context, url, xAccountToTag);

    if (!generationResult.success || !generationResult.content) {
      return NextResponse.json(
        { error: generationResult.error || "Failed to generate tweet content" },
        { status: 500 }
      );
    }

    // If we're also posting (generate and post in one step)
    if (post) {
      const postResult = await agentTweetService.postTweet({
        agentId,
        userId,
        text: generationResult.content
      });

      if (!postResult.success) {
        return NextResponse.json(
          { error: postResult.error || 'Failed to post generated tweet' },
          { status: 400 }
        );
      }

      // Include generation tracking for posted tweets if this is a regeneration
      if (isRegeneration) {
        const generationsResult = await incrementCustomGenerations(userId);
        return NextResponse.json({
          message: 'Tweet generated and posted successfully',
          tweet: postResult.tweet,
          generationsInfo: {
            used: generationsResult.used,
            total: generationsResult.total,
            remaining: generationsResult.remaining
          }
        }, { status: 201 });
      }

      return NextResponse.json({
        message: 'Tweet generated and posted successfully',
        tweet: postResult.tweet
      }, { status: 201 });
    }

    // Handle generation tracking for standalone generations
    let generationsInfo;
    if (isRegeneration) {
      // For regenerations, increment the counter
      const generationsResult = await incrementCustomGenerations(userId);
      generationsInfo = {
        used: generationsResult.used,
        total: generationsResult.total,
        remaining: generationsResult.remaining
      };
    } else {
      // For first-time generations, just include current info without incrementing
      const generationsAvailable = await checkCustomGenerationsAvailable(userId);
      generationsInfo = {
        used: generationsAvailable.used,
        total: generationsAvailable.total,
        remaining: generationsAvailable.remaining
      };
    }

    // Return the generated tweet content
    const response = {
      success: true,
      message: 'Tweet generated successfully',
      tweet: {
        text: generationResult.content
      },
      generationsInfo
    };

    console.log('Generated tweet response:', response);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error(`Error processing generate tweet request for agent ${agentId}:`, error);
    return handleError(error, `Generate Tweet Agent ${agentId}`);
  }
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 