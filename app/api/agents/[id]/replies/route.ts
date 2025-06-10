import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";
import { EXPRESS_SERVER_URL } from "@/app/config/server";

/**
 * GET - Get replies for an agent with pagination and filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 3. Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      select: { userId: true, name: true }
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 4. Build query filters
    const whereClause: any = { agentId };
    
    if (status && ['pending', 'posting', 'posted', 'failed', 'rejected'].includes(status)) {
      whereClause.status = status;
    }

    // 5. Get total count for pagination
    const totalCount = await prisma.reply.count({ where: whereClause });

    // 6. Get replies with pagination
    const replies = await prisma.reply.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        replyId: true,
        originalTweetId: true,
        originalTweetText: true,
        originalTweetUser: true,
        replyText: true,
        status: true,
        score: true,
        confidence: true,
        scheduledTime: true,
        postedTime: true,
        twitterReplyId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 7. Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        replies,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error("[Replies GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually trigger auto-engage cycle or generate test replies
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { action, dryRun = false } = body;

    if (!action || !['trigger_cycle', 'test_analysis'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'trigger_cycle' or 'test_analysis'" },
        { status: 400 }
      );
    }

    // 3. Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      select: { userId: true, name: true }
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    console.log(`[Next API Replies Route] Running local auto-engage cycle for Agent ${agentId} (User: ${userId}).`);

    // 4. Run auto-engage cycle using local service (no Express forwarding)
    const { autoEngageService } = await import("@/app/api/auto-engage-service");
    
    const result = await autoEngageService.runAutoEngageCycle(agentId, userId);
    
    if (!result.success) {
      console.error(`[Next API Replies Route] Auto-engage cycle failed for Agent ${agentId}:`, result.error);
      return NextResponse.json(
        {
          error: result.error || "Auto-engage cycle failed",
          details: result.error
        },
        { status: 400 }
      );
    }

    console.log(`[Next API Replies Route] Auto-engage cycle completed for Agent ${agentId}:`, result.results);
    
    // Return results in the expected format
    return NextResponse.json({
      success: true,
      message: "Auto-engage cycle completed successfully",
      results: {
        tweetsFetched: result.results?.tweetsFetched || 0,
        repliesGenerated: result.results?.repliesGenerated || 0,
        repliesPosted: result.results?.repliesPosted || 0,
        repliesFailed: result.results?.repliesFailed || 0
      }
    });

  } catch (error: any) {
    console.error(`[Next API Replies Route] Error processing auto-engage request for Agent ${params?.id}:`, error);

    if (error.message === 'Authentication required' || error.status === 401) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // Include the specific error message in the response
    return NextResponse.json(
      { error: "Failed to process auto-engage request.", details: error.message },
      { status: 500 }
    );
  }
} 