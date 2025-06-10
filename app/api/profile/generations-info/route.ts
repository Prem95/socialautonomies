import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import { checkCustomGenerationsAvailable } from "@/app/api/utils/profile-service";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Authenticate user
    const userId = await requireAuth(request);
    console.log(`Fetching generations info for user: ${userId}`);
    
    // Check custom generations available
    const generationsInfo = await checkCustomGenerationsAvailable(userId);
    console.log(`Generations info for user ${userId}:`, {
      used: generationsInfo.used,
      total: generationsInfo.total,
      remaining: generationsInfo.remaining,
      available: generationsInfo.available
    });
    
    // Return the information
    return NextResponse.json({
      used: generationsInfo.used,
      total: generationsInfo.total,
      remaining: generationsInfo.remaining,
      available: generationsInfo.available
    });
  } catch (error) {
    console.error("Error fetching generations info:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations info" },
      { status: 500 }
    );
  }
} 