/**
 * Next.js API Route: Schedule Tweet
 * 
 * Endpoint for scheduling tweets using agent personalities
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";
import { twitterV2Service } from "@/app/api/twitter-v2-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  console.log(`[Next API /schedule-tweet] Received request for agent ${agentId}`);

  try {
    // 1. Authenticate the request using Next.js auth
    const userId = await requireAuth(request);
    console.log(`[Next API /schedule-tweet] User ${userId} authenticated for agent ${agentId}`);
    
    // 2. Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: { twitterAuth: true }
    });
    
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to agent" }, { status: 403 });
    }

    // 3. Parse the request body
    const body = await request.json();
    const { scheduledAt, tweet } = body;

    if (!scheduledAt || !tweet || typeof tweet.text !== 'string') {
      console.log("[Next API /schedule-tweet] Invalid request body:", body);
      return NextResponse.json({ 
        error: "Invalid request body: 'scheduledAt' and 'tweet.text' are required." 
      }, { status: 400 });
    }
    
    // 4. Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledAt);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return NextResponse.json({ 
        error: "Schedule time must be in the future" 
      }, { status: 400 });
    }
    
    // 5. Verify Twitter authentication
    if (!agent.twitterAuth || !agent.twitterAuth.accessToken || !agent.twitterAuth.accessSecret) {
      return NextResponse.json({ 
        error: "Twitter authentication required", 
        details: "Agent is not properly connected to Twitter. Please connect or reconnect your Twitter account."
      }, { status: 401 });
    }
    
    // 6. Schedule the tweet in the database using the Tweet model with 'scheduled' status
    console.log(`[Next API /schedule-tweet] Scheduling tweet for agent ${agentId} at ${scheduledTime.toISOString()}`);
    
    const scheduledTweet = await prisma.tweet.create({
      data: {
        agentId,
        text: tweet.text,
        postTime: scheduledTime, // Use postTime for the scheduled time
        status: 'scheduled', // Use the TweetStatus enum value
        context: tweet.context || null,
        url: tweet.url || null
        // Note: xAccountToTag is not in the Tweet model, so we omit it
      }
    });
    
    // 7. Return successful response with scheduled tweet details
    console.log(`[Next API /schedule-tweet] Tweet scheduled successfully. ID: ${scheduledTweet.tweetId}`);
    
    return NextResponse.json({
      success: true,
      message: "Tweet scheduled successfully",
      scheduledTweet: {
        id: scheduledTweet.tweetId,
        text: scheduledTweet.text,
        scheduledAt: scheduledTweet.postTime
      }
    });

  } catch (error: any) {
    console.error(`[Next API /schedule-tweet] Error processing request for agent ${agentId}:`, error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // General server error
    return NextResponse.json(
      { error: "Failed to process schedule tweet request", details: error.message },
      { status: 500 }
    );
  }
}

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