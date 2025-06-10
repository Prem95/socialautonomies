import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/utils/auth';
import { twitterAuthService } from '@/app/api/twitter-auth-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID
    const userId = await requireAuth(request);
    console.log(`[Twitter Profile Me Route] Getting profile for user: ${userId}`);

    // Use the Twitter Auth Service to get profile
    const result = await twitterAuthService.getCurrentUserProfile(userId);

    if (!result.success) {
      const statusCode = result.error?.includes('CREDENTIALS') ? 401 : 404;
      return NextResponse.json({
        success: false,
        error: result.error || 'PROFILE_NOT_FOUND',
        message: result.errorDetails || 'Could not retrieve profile',
        details: result.errorDetails || 'Unable to fetch current user profile from Twitter.'
      }, { status: statusCode });
    }

    console.log(`[Twitter Profile Me Route] Successfully retrieved profile for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      profile: {
        ...result.profile,
        public_metrics: {
          tweet_count: result.profile.tweetsCount || 0,
          followers_count: result.profile.followersCount || 0,
          following_count: result.profile.followingCount || 0,
          like_count: result.profile.likesCount || 0
        }
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