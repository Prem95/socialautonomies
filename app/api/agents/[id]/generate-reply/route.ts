/**
 * Next.js API Route: Generate Reply
 * 
 * Generates a reply to a tweet using the agent's personality via LLM
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import llmService from "@/app/api/llm-service";
import prisma from "@/app/db/utils/dbClient";

// Add this to make the route dynamic and not static
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await requireAuth(request);
    
    // Get agent ID from route params
    const agentId = params.id;
    
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
    
    // Extract parameters from request body
    const body = await request.json();
    const { 
      tweetId, 
      tweetText, 
      tweetUsername, 
      tweetUserDisplayName,
      tweetMedia = [], // Optional media information
    } = body;
    
    if (!tweetId || !tweetText) {
      return NextResponse.json(
        { error: "Missing required parameters: tweetId and tweetText" },
        { status: 400 }
      );
    }
    
    // Create context for LLM
    let tweetContext = `Tweet from @${tweetUsername}`;
    if (tweetUserDisplayName) {
      tweetContext += ` (${tweetUserDisplayName})`;
    }
    tweetContext += `: "${tweetText}"`;
    
    // Add media information if present
    if (tweetMedia && tweetMedia.length > 0) {
      tweetContext += `\n\nThe tweet contains ${tweetMedia.length} media item(s). `;
      tweetMedia.forEach((media: any, index: number) => {
        if (media.type === 'photo') {
          tweetContext += `Media ${index + 1}: A photo. `;
        } else if (media.type === 'video') {
          tweetContext += `Media ${index + 1}: A video. `;
        } else if (media.type === 'animated_gif') {
          tweetContext += `Media ${index + 1}: An animated GIF. `;
        }
      });
    }
    
    // Generate the reply
    const replyText = await llmService.generateAgentTweetReply(
      agentId,
      tweetContext,
      agent
    );
    
    if (!replyText) {
      return NextResponse.json(
        { error: "Failed to generate reply" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reply: {
        text: replyText,
        tweetId,
        context: tweetContext
      }
    });
    
  } catch (error) {
    console.error("Error generating reply:", error);
    return NextResponse.json(
      { error: "Failed to generate reply", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 