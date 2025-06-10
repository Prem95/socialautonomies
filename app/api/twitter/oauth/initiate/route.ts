import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, handleError } from '../../../middleware/security';
import { TwitterApi, ApiResponseError } from 'twitter-api-v2';
import { tokenStore } from '../../../services/token-store';
import { NEXT_PUBLIC_APP_URL } from '@/app/config/env';

export const dynamic = 'force-dynamic';

// Rate limiting for OAuth requests (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per 5 minutes per user

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

export const GET = withSecurity(undefined, false)(async (
  request: NextRequest,
  context: any,
  user
) => {
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId;

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many OAuth requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Extract and validate agentId from query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid agentId query parameter is required' },
        { status: 400 }
      );
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agentId format' },
        { status: 400 }
      );
    }

    console.log(`[Twitter OAuth Initiate] Starting OAuth flow for agent ${agentId}, user ${userId}`);

    // Check for required Twitter API credentials
    const appKey = process.env.TWITTER_API_KEY;
    const appSecret = process.env.TWITTER_API_SECRET;
    const nextJsAppUrl = NEXT_PUBLIC_APP_URL;

    if (!appKey || !appSecret) {
      console.error("Missing required Twitter API Keys for OAuth routes");
      return NextResponse.json(
        { error: 'Server configuration error: Twitter API keys missing' },
        { status: 500 }
      );
    }

    if (!nextJsAppUrl) {
      console.error("Missing NEXT_PUBLIC_APP_URL configuration");
      return NextResponse.json(
        { error: 'Server configuration error: App URL missing' },
        { status: 500 }
      );
    }

    console.log(`[Twitter OAuth Initiate] Next.js app URL: ${nextJsAppUrl}`);

    try {
      // Construct callback URL - now points to Next.js instead of Express
      const callbackUrl = `${nextJsAppUrl}/api/twitter/oauth/callback?agentId=${encodeURIComponent(agentId)}`;
      console.log(`[Twitter OAuth] Using callback URL: ${callbackUrl}`);

      // Initialize Twitter API client with timeout
      const client = new TwitterApi({ 
        appKey, 
        appSecret,
        // Add timeout configuration
        timeout: 10000 // 10 seconds timeout
      });

      // Generate OAuth authorization link with optimized parameters
      const authLink = await client.generateAuthLink(callbackUrl, { 
        linkMode: 'authorize',
        authAccessType: 'write',
        forceLogin: false,
        includeEmail: false // Don't request email to speed up flow
      });

      // Save temporary tokens for the OAuth flow
      await tokenStore.saveTemporarySecret(agentId, authLink.oauth_token, authLink.oauth_token_secret);

      console.log(`[Twitter OAuth] Successfully generated auth link for agent ${agentId}`);

      return NextResponse.json({ 
        authUrl: authLink.url,
        success: true 
      });

    } catch (error) {
      console.error(`Authentication initiation failed for agent ${agentId}:`, error);
      
      let errorMessage = 'Failed to initiate Twitter OAuth flow.';
      let statusCode = 500;
      
      if (error instanceof ApiResponseError) {
        errorMessage = `Twitter API Error: ${error.message}`;
        // Map Twitter API errors to appropriate HTTP status codes
        if (error.code === 429) {
          statusCode = 429;
          errorMessage = 'Twitter API rate limit exceeded. Please try again later.';
        } else if (error.code >= 400 && error.code < 500) {
          statusCode = 400;
        }
      } else if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          statusCode = 408;
          errorMessage = 'Request to Twitter API timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Clear potentially stale temp tokens on failure
      try {
        await tokenStore.clearTemporaryTokensByAgent(agentId);
      } catch (cleanupError) {
        console.error(`Failed to clear temp tokens for agent ${agentId}:`, cleanupError);
      }
      
      return NextResponse.json(
        { error: errorMessage, success: false },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error(`Twitter OAuth initiate error:`, error);
    return handleError(error, 'Twitter OAuth Initiate');
  }
}); 