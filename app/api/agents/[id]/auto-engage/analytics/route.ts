import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";

/**
 * GET - Get auto-engage analytics and performance metrics
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
    const period = searchParams.get('period') || '30'; // days
    const periodDays = Math.min(parseInt(period), 365); // Max 1 year

    // 3. Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      select: { 
        userId: true, 
        name: true,
        autoEngageEnabled: true,
        autoEngageFrequencyHours: true,
        autoEngageMaxReplies: true,
        autoEngageMinScore: true,
        lastAutoEngageTime: true
      }
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

    // 4. Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 5. Get reply statistics
    const replyStats = await prisma.reply.groupBy({
      by: ['status'],
      where: {
        agentId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        status: true
      }
    });

    // 6. Get daily activity for charts
    const dailyActivityRaw = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_replies,
        COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_replies,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_replies,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_replies,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_replies,
        AVG(score) as avg_score,
        AVG(confidence) as avg_confidence
      FROM replies 
      WHERE agent_id = ${agentId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Convert BigInt values to numbers for JSON serialization
    const dailyActivity = (dailyActivityRaw as any[]).map(row => ({
      date: row.date,
      total_replies: Number(row.total_replies),
      posted_replies: Number(row.posted_replies),
      pending_replies: Number(row.pending_replies),
      rejected_replies: Number(row.rejected_replies),
      failed_replies: Number(row.failed_replies),
      avg_score: row.avg_score ? Number(row.avg_score) : 0,
      avg_confidence: row.avg_confidence ? Number(row.avg_confidence) : 0
    }));

    // 7. Get top performing replies (by score)
    const topReplies = await prisma.reply.findMany({
      where: {
        agentId,
        status: 'posted',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        replyId: true,
        originalTweetText: true,
        originalTweetUser: true,
        replyText: true,
        score: true,
        confidence: true,
        postedTime: true,
        twitterReplyId: true
      }
    });

    // 8. Get recent activity
    const recentReplies = await prisma.reply.findMany({
      where: {
        agentId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        replyId: true,
        originalTweetText: true,
        originalTweetUser: true,
        replyText: true,
        status: true,
        score: true,
        confidence: true,
        createdAt: true,
        postedTime: true,
        twitterReplyId: true
      }
    });

    // 9. Calculate summary metrics
    const totalReplies = replyStats.reduce((sum, stat) => sum + stat._count.status, 0);
    const postedReplies = replyStats.find(stat => stat.status === 'posted')?._count.status || 0;
    const pendingReplies = replyStats.find(stat => stat.status === 'pending')?._count.status || 0;
    const rejectedReplies = replyStats.find(stat => stat.status === 'rejected')?._count.status || 0;
    const failedReplies = replyStats.find(stat => stat.status === 'failed')?._count.status || 0;

    const successRate = totalReplies > 0 ? (postedReplies / totalReplies) * 100 : 0;

    // 10. Calculate average metrics
    const avgMetrics = await prisma.reply.aggregate({
      where: {
        agentId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _avg: {
        score: true,
        confidence: true
      }
    });

    // 11. Calculate engagement trends (compare with previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    const previousPeriodStats = await prisma.reply.groupBy({
      by: ['status'],
      where: {
        agentId,
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      },
      _count: {
        status: true
      }
    });

    const previousTotalReplies = previousPeriodStats.reduce((sum, stat) => sum + stat._count.status, 0);
    const previousPostedReplies = previousPeriodStats.find(stat => stat.status === 'posted')?._count.status || 0;
    
    const replyGrowth = previousTotalReplies > 0 ? 
      ((totalReplies - previousTotalReplies) / previousTotalReplies) * 100 : 
      totalReplies > 0 ? 100 : 0;

    const successRateGrowth = previousPostedReplies > 0 ? 
      ((postedReplies - previousPostedReplies) / previousPostedReplies) * 100 : 
      postedReplies > 0 ? 100 : 0;

    // 12. Return analytics data
    return NextResponse.json({
      success: true,
      analytics: {
        period: {
          days: periodDays,
          startDate,
          endDate
        },
        summary: {
          totalReplies,
          postedReplies,
          pendingReplies,
          rejectedReplies,
          failedReplies,
          successRate: Math.round(successRate * 100) / 100,
          avgScore: Math.round((avgMetrics._avg.score || 0) * 100) / 100,
          avgConfidence: Math.round((avgMetrics._avg.confidence || 0) * 100) / 100
        },
        trends: {
          replyGrowth: Math.round(replyGrowth * 100) / 100,
          successRateGrowth: Math.round(successRateGrowth * 100) / 100
        },
        dailyActivity,
        topReplies,
        recentActivity: recentReplies,
        configuration: {
          enabled: agent.autoEngageEnabled,
          frequencyHours: agent.autoEngageFrequencyHours,
          maxReplies: agent.autoEngageMaxReplies,
          minScore: agent.autoEngageMinScore,
          lastRun: agent.lastAutoEngageTime
        }
      }
    });

  } catch (error) {
    console.error("[Auto-Engage Analytics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 