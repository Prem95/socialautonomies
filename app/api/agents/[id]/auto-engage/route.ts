import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";

/**
 * GET - Get auto-engage configuration for an agent
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

    // 2. Get agent and verify ownership in single query
    const agent = await prisma.agent.findFirst({
      where: { 
        agentId,
        userId // Validates ownership in the same query
      },
      select: {
        agentId: true,
        userId: true,
        name: true,
        autoEngageEnabled: true,
        autoEngageFrequencyHours: true,
        autoEngageMaxReplies: true,
        autoEngageMinScore: true,
        autoEngageAutoReply: true,
        autoEngageQualityFilter: true,
        autoEngageStrictnessLevel: true,
        lastAutoEngageTime: true
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // 3. Return auto-engage configuration
    return NextResponse.json({
      success: true,
      config: {
        enabled: agent.autoEngageEnabled,
        frequencyHours: agent.autoEngageFrequencyHours,
        maxReplies: agent.autoEngageMaxReplies,
        minScore: agent.autoEngageMinScore,
        autoReply: agent.autoEngageAutoReply,
        qualityFilter: agent.autoEngageQualityFilter,
        strictnessLevel: agent.autoEngageStrictnessLevel,
        lastRunTime: agent.lastAutoEngageTime
      }
    });

  } catch (error) {
    console.error("[Auto-Engage Config GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update auto-engage configuration for an agent
 */
export async function PUT(
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
    const { 
      enabled, 
      frequencyHours, 
      maxReplies, 
      minScore, 
      autoReply,
      qualityFilter,
      strictnessLevel
    } = body;

    // 3. Validate input
    if (enabled && (!frequencyHours || !maxReplies || minScore === undefined)) {
      return NextResponse.json(
        { error: "Frequency hours, max replies, and min score are required when enabling auto-engage" },
        { status: 400 }
      );
    }

    if (frequencyHours && (frequencyHours < 0.0833 || frequencyHours > 168)) {
      return NextResponse.json(
        { error: "Frequency hours must be between 0.0833 (5 minutes) and 168 (1 week)" },
        { status: 400 }
      );
    }

    if (maxReplies && (maxReplies < 1 || maxReplies > 50)) {
      return NextResponse.json(
        { error: "Max replies must be between 1 and 50" },
        { status: 400 }
      );
    }

    if (minScore !== undefined && (minScore < 0 || minScore > 1000)) {
      return NextResponse.json(
        { error: "Min score must be between 0 and 1000" },
        { status: 400 }
      );
    }

    if (strictnessLevel !== undefined && (strictnessLevel < 0 || strictnessLevel > 5)) {
      return NextResponse.json(
        { error: "Strictness level must be between 0 and 5" },
        { status: 400 }
      );
    }

    // 4. Update agent configuration with ownership validation in single query
    const updatedAgent = await prisma.agent.updateMany({
      where: { 
        agentId,
        userId // Validates ownership in the same query
      },
      data: {
        autoEngageEnabled: enabled || false,
        autoEngageFrequencyHours: enabled ? frequencyHours : null,
        autoEngageMaxReplies: enabled ? maxReplies : null,
        autoEngageMinScore: enabled ? minScore : null,
        autoEngageAutoReply: enabled ? (autoReply || false) : false,
        autoEngageQualityFilter: enabled ? (qualityFilter !== undefined ? qualityFilter : true) : true,
        autoEngageStrictnessLevel: enabled ? (strictnessLevel !== undefined ? strictnessLevel : 2) : 2
      }
    });

    if (updatedAgent.count === 0) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // 5. Get updated agent data for response
    const agent = await prisma.agent.findFirst({
      where: { agentId, userId },
      select: {
        name: true,
        autoEngageEnabled: true,
        autoEngageFrequencyHours: true,
        autoEngageMaxReplies: true,
        autoEngageMinScore: true,
        autoEngageAutoReply: true,
        autoEngageQualityFilter: true,
        autoEngageStrictnessLevel: true
      }
    });

    console.log(`[Auto-Engage Config] Updated settings for agent ${agent?.name} (${agentId}):`, {
      enabled: agent?.autoEngageEnabled,
      frequencyHours: agent?.autoEngageFrequencyHours,
      maxReplies: agent?.autoEngageMaxReplies,
      minScore: agent?.autoEngageMinScore,
      autoReply: agent?.autoEngageAutoReply,
      qualityFilter: agent?.autoEngageQualityFilter,
      strictnessLevel: agent?.autoEngageStrictnessLevel
    });

    return NextResponse.json({
      success: true,
      message: enabled ? "Auto-engage enabled successfully" : "Auto-engage disabled successfully",
      config: {
        enabled: agent?.autoEngageEnabled,
        frequencyHours: agent?.autoEngageFrequencyHours,
        maxReplies: agent?.autoEngageMaxReplies,
        minScore: agent?.autoEngageMinScore,
        autoReply: agent?.autoEngageAutoReply,
        qualityFilter: agent?.autoEngageQualityFilter,
        strictnessLevel: agent?.autoEngageStrictnessLevel
      }
    });

  } catch (error) {
    console.error("[Auto-Engage Config PUT] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 