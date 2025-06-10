import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/utils/auth";
import prisma from "@/app/db/utils/dbClient";
import { Scraper } from "agent-twitter-client";

export const dynamic = 'force-dynamic';

/**
 * Helper function to get valid cookies from the database
 */
async function getValidCookiesFromDatabase(userId: string) {
  try {
    return await prisma.cookie.findMany({
      where: {
        userId,
        OR: [
          { expires: null },            // Session cookies
          { expires: { gt: new Date() } } // Non-expired cookies
        ]
      }
    });
  } catch (error) {
    console.error(`Error fetching cookies for user ${userId}:`, error);
    return [];
  }
}

/**
 * Helper function to format cookies for the Twitter API
 */
function formatCookiesForTwitterApi(cookies: any[]) {
  return cookies.map((cookie: any) => 
    `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
      cookie.path || '/'
    }; ${cookie.secure ? 'Secure' : ''}; ${
      cookie.httpOnly ? 'HttpOnly' : ''
    }; SameSite=${cookie.sameSite || 'Lax'}`
  );
}

export async function GET(request: Request) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    // console.log(`[Twitter Profile Me Route] Getting profile for user: ${userId}`);
    
    // Get valid cookies from database
    const validCookies = await getValidCookiesFromDatabase(userId);

    if (!validCookies || validCookies.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'CREDENTIALS_REQUIRED',
        message: 'No valid Twitter cookies found',
        details: 'Please add your Twitter cookies to continue.'
      }, { status: 401 });
    }

    // Initialize Twitter scraper with cookies
    const scraper = new Scraper();
    const cookieStrings = formatCookiesForTwitterApi(validCookies);
    await scraper.setCookies(cookieStrings);

    // Verify login status
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      return NextResponse.json({
        success: false,
        error: 'CREDENTIALS_REQUIRED',
        message: 'Twitter session expired',
        details: 'Your Twitter cookies appear to be invalid or expired.'
      }, { status: 401 });
    }

    // Get current user's profile
    const profile = await scraper.me();
    
    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'PROFILE_NOT_FOUND',
        message: 'Could not retrieve profile',
        details: 'Unable to fetch current user profile from Twitter.'
      }, { status: 404 });
    }

    // console.log(`[Twitter Profile Me Route] Successfully retrieved profile for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      profile: {
        id: profile.userId,
        username: profile.username,
        name: profile.name,
        followers: profile.followersCount,
        following: profile.followingCount,
        verified: profile.isVerified || false,
        profileImageUrl: profile.avatar,
        description: profile.biography || '',
        location: profile.location || '',
        website: profile.website || '',
        joinDate: profile.joined || null,
        tweetsCount: profile.tweetsCount || 0,
        likesCount: profile.likesCount || 0,
        followersCount: profile.followersCount || 0,
        followingCount: profile.followingCount || 0
      }
    });

  } catch (error) {
    console.error('[Twitter Profile Me Route] Error fetching current user profile:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch current user profile',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Note: POST functionality for credential submission is now handled by /api/agents/[id]/twitter-auth
