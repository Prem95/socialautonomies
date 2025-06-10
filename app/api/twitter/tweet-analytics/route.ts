import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import { EXPRESS_SERVER_URL } from '@/app/config/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    
    const { searchParams } = new URL(request.url);
    const tweetId = searchParams.get("tweetId");

    if (!tweetId) {
      return NextResponse.json(
        { error: "Tweet ID is required" },
        { status: 400 }
      );
    }
    
    // Forward the request to the Express backend with the correct path
    console.log(`Forwarding tweet analytics request for ID ${tweetId} to Express server`);
    
    const response = await fetch(`${EXPRESS_SERVER_URL}/api/twitter/tweet-analytics?tweetId=${encodeURIComponent(tweetId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId // Pass user ID to Express server
      }
    });
    
    // Get the response from the Express server
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error(`Express server error (${response.status}):`, responseData);
      return NextResponse.json(
        responseData,
        { status: response.status }
      );
    }
    
    // Return the analytics data from the Express server
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error("Error fetching tweet analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch tweet analytics" },
      { status: 500 }
    );
  }
} 