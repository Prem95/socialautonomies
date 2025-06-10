import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";

// Define the expected parameters from the dynamic route
interface Params {
  id: string; // Matches the folder name [id]
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    // 1. Authenticate the request using Next.js auth
    const userId = await requireAuth(request);
    const agentId = params.id; // Get agentId from the 'id' parameter

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    console.log(`[Next API /disconnect] Processing disconnect for agent ${agentId} by user ${userId}`);

    // 2. Handle disconnection directly using agentService
    const { agentService } = await import('@/app/db/services');
    const updatedAgent = await agentService.disconnectTwitterForAgent(userId, agentId);

    console.log(`[Next API /disconnect] Successfully disconnected X account for agent ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'X account disconnected successfully',
      agent: updatedAgent
    });

  } catch (error: any) {
    console.error("[Next API /disconnect] Error in route handler:", error);

    // Handle specific auth errors from requireAuth
    if (error.message === 'Authentication required' || error.status === 401) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // Handle specific database errors
    if (error.code === 'RECORD_NOT_FOUND') {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }
    
    if (error.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: "Agent does not belong to user" },
        { status: 403 }
      );
    }
    
    // Handle other errors gracefully
    return NextResponse.json(
      { error: "Failed to disconnect X account", details: error.message },
      { status: 500 }
    );
  }
} 