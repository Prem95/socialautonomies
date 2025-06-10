import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";

/**
 * GET - Get details of a specific reply
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; replyId: string } }
) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;
    const replyId = params.replyId;

    if (!agentId || !replyId) {
      return NextResponse.json(
        { error: "Agent ID and Reply ID are required" },
        { status: 400 }
      );
    }

    // 2. Verify agent ownership
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

    // 3. Get reply details
    const reply = await prisma.reply.findUnique({
      where: { 
        replyId,
        agentId // Ensure reply belongs to the agent
      }
    });

    if (!reply) {
      return NextResponse.json(
        { error: "Reply not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("[Reply GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update reply status (approve, reject, or edit)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; replyId: string } }
) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;
    const replyId = params.replyId;

    if (!agentId || !replyId) {
      return NextResponse.json(
        { error: "Agent ID and Reply ID are required" },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { action, replyText, scheduledTime } = body;

    if (!action || !['approve', 'reject', 'edit', 'schedule'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', 'edit', or 'schedule'" },
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

    // 4. Get current reply
    const currentReply = await prisma.reply.findUnique({
      where: { 
        replyId,
        agentId
      }
    });

    if (!currentReply) {
      return NextResponse.json(
        { error: "Reply not found" },
        { status: 404 }
      );
    }

    // 5. Validate action based on current status
    if (currentReply.status === 'posted') {
      return NextResponse.json(
        { error: "Cannot modify a reply that has already been posted" },
        { status: 400 }
      );
    }

    if (currentReply.status === 'posting') {
      return NextResponse.json(
        { error: "Cannot modify a reply that is currently being posted" },
        { status: 400 }
      );
    }

    // 6. Perform the requested action
    let updateData: any = {};
    let message = "";

    switch (action) {
      case 'approve':
        updateData = { 
          status: 'pending',
          scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(Date.now() + 60000) // 1 minute delay
        };
        message = "Reply approved and scheduled for posting";
        break;

      case 'reject':
        updateData = { status: 'rejected' };
        message = "Reply rejected";
        break;

      case 'edit':
        if (!replyText) {
          return NextResponse.json(
            { error: "Reply text is required for editing" },
            { status: 400 }
          );
        }
        updateData = { 
          replyText,
          status: 'pending' // Reset to pending after edit
        };
        message = "Reply updated";
        break;

      case 'schedule':
        if (!scheduledTime) {
          return NextResponse.json(
            { error: "Scheduled time is required" },
            { status: 400 }
          );
        }
        const scheduleDate = new Date(scheduledTime);
        if (scheduleDate <= new Date()) {
          return NextResponse.json(
            { error: "Scheduled time must be in the future" },
            { status: 400 }
          );
        }
        updateData = { 
          scheduledTime: scheduleDate,
          status: 'pending'
        };
        message = "Reply scheduled successfully";
        break;
    }

    // 7. Update reply in database
    const updatedReply = await prisma.reply.update({
      where: { replyId },
      data: updateData
    });

    console.log(`[Reply PUT] ${action} action performed on reply ${replyId} for agent ${agent.name} (${agentId})`);

    // 8. If approved/scheduled, attempt to post immediately if time is due
    // Note: Immediate posting functionality disabled - postReply method doesn't exist in autoEngageService
    // Replies will be posted by the scheduler service instead
    if (action === 'approve' && updateData.scheduledTime && updateData.scheduledTime <= new Date()) {
      message += " and scheduled for posting by the scheduler";
    }

    return NextResponse.json({
      success: true,
      message,
      reply: updatedReply
    });

  } catch (error) {
    console.error("[Reply PUT] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a specific reply
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; replyId: string } }
) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    const agentId = params.id;
    const replyId = params.replyId;

    if (!agentId || !replyId) {
      return NextResponse.json(
        { error: "Agent ID and Reply ID are required" },
        { status: 400 }
      );
    }

    // 2. Verify agent ownership
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

    // 3. Get current reply
    const currentReply = await prisma.reply.findUnique({
      where: { 
        replyId,
        agentId
      }
    });

    if (!currentReply) {
      return NextResponse.json(
        { error: "Reply not found" },
        { status: 404 }
      );
    }

    // 4. Validate deletion is allowed
    if (currentReply.status === 'posted') {
      return NextResponse.json(
        { error: "Cannot delete a reply that has already been posted" },
        { status: 400 }
      );
    }

    if (currentReply.status === 'posting') {
      return NextResponse.json(
        { error: "Cannot delete a reply that is currently being posted" },
        { status: 400 }
      );
    }

    // 5. Delete the reply
    await prisma.reply.delete({
      where: { replyId }
    });

    console.log(`[Reply DELETE] Reply ${replyId} deleted for agent ${agent.name} (${agentId})`);

    return NextResponse.json({
      success: true,
      message: "Reply deleted successfully"
    });

  } catch (error) {
    console.error("[Reply DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 