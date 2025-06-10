/**
 * SocialAgents Express Routes that communicate with the SocialAgents backend services
 * 
 * API endpoints for X integration and profile data
 */

import express, { Request, Response } from 'express';
import { twitterAuthService } from '../twitter-auth-service';
import { TwitterApi } from '../twitter-api';
import prisma from '../../db/utils/dbClient';

const router = express.Router();

/**
 * Get user ID from request or use default if not set
 */
function getUserId(req: Request): string {
  return req.userId || (req.headers['x-user-id'] as string);
}

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

// /**
//  * @route GET /api/twitter/profile
//  * @desc Get X profile data including tweets, followers, and following counts
//  * @access Public
//  */
// router.get('/profile', async (req: Request, res: Response) => {
//   try {
//     const { username } = req.query;
//     const userId = getUserId(req);
//     console.log('profile userId:', userId);
//     console.log('profile username:', username);

//     if (!username || typeof username !== 'string') {
//       return res.status(400).json({ 
//         error: 'Username is required',
//         details: 'Please provide a X username as a query parameter'
//       });
//     }

//     // Use twitterAuthService to get profile information
//     const result = await twitterAuthService.getTwitterProfile(userId, username);
//     console.log('Result for profile:', result);
    
//     if (!result.success) {
//       return res.status(401).json({ 
//         error: result.error || 'Failed to get X profile',
//         details: 'There was an issue authenticating with X or fetching the profile'
//       });
//     }
    
//     // Return the profile data
//     return res.json(result.profile);
//   } catch (error) {
//     console.error('Error fetching X profile:', error);
//     return res.status(500).json({ 
//       error: 'Failed to fetch X profile data',
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// });

/**
 * @route GET /api/twitter/tweet-analytics-scraper
 * @desc Get public analytics data for a specific tweet using cookie-based scraping
 * @access Public (but requires valid user session via X-User-Id header)
 */
// @ts-ignore - TypeScript incorrectly infers router.get overload
router.get('/tweet-analytics-scraper', async (req: Request, res: Response) => {
  try {
    const { tweetId } = req.query;
    const userId = getUserId(req); // Relies on X-User-Id header passed from Next.js

    // Add Log: Show received parameters
    console.log(`[Express Scraper Route] Handling request for Tweet ${tweetId}, User ${userId}`);

    if (!userId) {
       console.warn(`[Express Scraper Route] Missing userId (X-User-Id header) for Tweet ${tweetId}`);
       return res.status(401).json({
           error: 'Unauthorized',
           details: 'User identifier (X-User-Id) is missing in the request header.'
       });
    }

    if (!tweetId || typeof tweetId !== 'string') {
       console.warn(`[Express Scraper Route] Missing tweetId query parameter for User ${userId}`);
      return res.status(400).json({
        error: 'Tweet ID is required',
        details: 'Please provide a X tweet ID as a query parameter'
      });
    }

    console.log(`[Express Scraper Route] Calling twitterAuthService.getTweetAnalyticsScraper for User ${userId}, Tweet ${tweetId}`);
    // Use the NEW twitterAuthService method
    const result = await twitterAuthService.getTweetAnalyticsScraper(userId, tweetId);

    // --- Add Log: Log the entire result from the service ---
    console.log(`[Express Scraper Route] Result from getTweetAnalyticsScraper for Tweet ${tweetId}:`, JSON.stringify(result, null, 2));
    // --- End Add Log ---

    if (!result.success) {
      // Determine appropriate status code based on error
      const statusCode = result.error?.includes('session') || result.error?.includes('Authentication') ? 401 : 404;
      console.warn(`[Express Scraper Route] Failed getTweetAnalyticsScraper for User ${userId}, Tweet ${tweetId}. Status: ${statusCode}, Error: ${result.error}, Details: ${result.errorDetails}`);
      return res.status(statusCode).json({
        error: result.error || 'Failed to get tweet analytics via scraper',
        details: result.errorDetails || 'Could not retrieve analytics using the scraper method.'
      });
    }

    // Return the analytics data
    console.log(`[Express Scraper Route] Successfully retrieved analytics via scraper for User ${userId}, Tweet ${tweetId}`);
    return res.json(result.analytics); // Send only the analytics object on success

  } catch (error) {
    const tweetIdParam = req.query.tweetId || 'unknown';
    console.error(`[Express Scraper Route - CATCH BLOCK] Error fetching scraper tweet analytics for Tweet ${tweetIdParam}:`, error);
    return res.status(500).json({
      error: 'Failed to fetch tweet analytics via scraper',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/twitter/home-timeline
 * @desc Get the user's home timeline (For You feed) using cookie-based authentication
 * @access Private (requires valid user session via X-User-Id header)
 */
// @ts-ignore - TypeScript incorrectly infers router.get overload
router.get('/home-timeline', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    console.log(`[Home Timeline Route] Fetching timeline for user: ${userId}`);

    if (!userId) {
      console.warn('[Home Timeline Route] Missing userId (X-User-Id header)');
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User identifier (X-User-Id) is missing in the request header.'
      });
    }

    // Get count parameter from query (default to 20)
    const count = parseInt(req.query.count as string || '3');
    
    // Get seenTweetIds parameter for pagination
    const seenTweetIds = req.query.seenTweetIds 
      ? (req.query.seenTweetIds as string).split(',') 
      : [];
    
    console.log(`[Home Timeline Route] Fetching ${count} tweets for user ${userId}`);
    
    // Use twitterAuthService to get home timeline
    const result = await twitterAuthService.getHomeTimeline(userId, count, seenTweetIds);
    
    if (!result.success) {
      const statusCode = result.error?.includes('session') || result.error?.includes('Authentication') ? 401 : 400;
      return res.status(statusCode).json({
        error: result.error || 'Failed to fetch home timeline',
        details: result.errorDetails || 'Could not retrieve timeline data.'
      });
    }
    
    console.log(`[Home Timeline Route] Successfully fetched ${result.tweets?.length || 0} tweets for user ${userId}`);
    
    return res.json({
      success: true,
      count: result.tweets?.length || 0,
      tweets: result.tweets
    });
    
  } catch (error) {
    console.error('[Home Timeline Route] Error fetching home timeline:', error);
    return res.status(500).json({
      error: 'Failed to fetch home timeline',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/twitter/profile/me
 * @desc Get current authenticated user's X profile data
 * @access Private (requires X-User-Id header)
 */
// @ts-ignore - TypeScript incorrectly infers router.get overload
router.get('/profile/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    // console.log(`[Twitter Profile Me Route] Getting profile for user: ${userId}`);

    if (!userId) {
      return res.status(401).json({
        error: 'CREDENTIALS_REQUIRED',
        message: 'User authentication required',
        details: 'Please provide valid Twitter cookies to continue.'
      });
    }

    // Get valid cookies from database
    const validCookies = await getValidCookiesFromDatabase(userId);

    if (!validCookies || validCookies.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'CREDENTIALS_REQUIRED',
        message: 'No valid Twitter cookies found',
        details: 'Please add your Twitter cookies to continue.'
      });
    }

    // Initialize Twitter API with cookies
    const api = new TwitterApi({
      cookiesPath: './data/cookies.json',
      debug: process.env.NODE_ENV !== 'production'
    });

    const cookieStrings = formatCookiesForTwitterApi(validCookies);
    const scraper = api.getScraper();
    await scraper.setCookies(cookieStrings);

    // Verify login status
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      return res.status(401).json({
        success: false,
        error: 'CREDENTIALS_REQUIRED',
        message: 'Twitter session expired',
        details: 'Your Twitter cookies appear to be invalid or expired.'
      });
    }

    // Get current user's profile
    const profile = await scraper.me();
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'PROFILE_NOT_FOUND',
        message: 'Could not retrieve profile',
        details: 'Unable to fetch current user profile from Twitter.'
      });
    }

    // console.log(`[Twitter Profile Me Route] Successfully retrieved profile for user ${userId}`);
    
    return res.json({
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
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch current user profile',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 