import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi, ApiResponseError } from 'twitter-api-v2';
import { tokenStore } from '@/app/api/services/token-store';
import { NEXT_PUBLIC_APP_URL } from '@/app/config/env';

// Color utility for better log organization
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bright: '\x1b[1m'
};

// Logging utility
const logger = {
  debug: (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.dim}[OAuthCallback]${colors.reset} ${message}`);
    }
  },
  info: (message: string) => {
    console.log(`${colors.blue}[OAuthCallback]${colors.reset} ${message}`);
  },
  success: (message: string) => {
    console.log(`${colors.green}[OAuthCallback]${colors.reset} ${message}`);
  },
  warn: (message: string) => {
    console.warn(`${colors.yellow}[OAuthCallback]${colors.reset} ${message}`);
  },
  error: (message: string, error?: any) => {
    console.error(
      `${colors.red}[OAuthCallback]${colors.reset} ${message}`, 
      error ? error : ''
    );
  },
  config: (message: string) => {
    console.log(`${colors.cyan}[OAuthCallback]${colors.reset} ${message}`);
  }
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauth_token = searchParams.get('oauth_token');
  const oauth_verifier = searchParams.get('oauth_verifier');
  const denied = searchParams.get('denied');
  const agentId = searchParams.get('agentId');
  
  // Environment variables
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const frontendAppUrl = NEXT_PUBLIC_APP_URL;
  
  // Validate environment variables
  if (!appKey || !appSecret) {
    logger.error('Missing required Twitter API Keys for OAuth callback');
    const errorUrl = `${frontendAppUrl}/dashboard/agents?agentId=${agentId || ''}&oauth_error=${encodeURIComponent('Server configuration error')}`;
    return NextResponse.redirect(errorUrl);
  }
  
  // This will use the hardcoded frontendAppUrl
  const redirectBase = `${frontendAppUrl}/dashboard/agents`; 
  let finalRedirectUrl = `${redirectBase}?agentId=${agentId || ''}`;

  // Helper to manage redirect URL construction
  const setRedirectError = (message: string) => {
    finalRedirectUrl += `&oauth_error=${encodeURIComponent(message)}`;
  };

  if (denied) {
    logger.warn(`User denied access for agent ${agentId}, reason: ${denied}`);
    setRedirectError('User denied X access');
    if (agentId && typeof agentId === 'string') {
      await tokenStore.clearTemporaryTokensByAgent(agentId); 
    }
    return NextResponse.redirect(finalRedirectUrl);
  }

  if (!oauth_token || typeof oauth_token !== 'string' || 
      !oauth_verifier || typeof oauth_verifier !== 'string' || 
      !agentId || typeof agentId !== 'string') {
    logger.error('Missing or invalid callback parameters');
    setRedirectError('Invalid callback parameters received');
    return NextResponse.redirect(finalRedirectUrl);
  }
  
  let oauth_token_secret: string | null = null; 
  try {
    oauth_token_secret = await tokenStore.getTemporarySecret(oauth_token);

    if (!oauth_token_secret) {
      logger.error(`No secret found for token: ${oauth_token.substring(0, 5)}...`);
      throw new Error('OAuth session expired or invalid. Please try connecting again.');
    }

    const client = new TwitterApi({
      appKey: appKey!,
      appSecret: appSecret!,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const {
      client: loggedClient, 
      accessToken,        
      accessSecret,       
      screenName,         
      userId: twitterUserId 
    } = await client.login(oauth_verifier);

    await tokenStore.savePermanentTokens(agentId, accessToken, accessSecret, twitterUserId, screenName);

    logger.success(`Agent ${colors.cyan}${agentId}${colors.reset}, X Account: ${colors.bright}@${screenName}${colors.reset} connected`);
    finalRedirectUrl += '&oauth_success=true';
    
  } catch (error) {
    logger.error(`OAuth callback error for agent ${agentId}:`, error);
    let errorMessage = 'Failed to complete Twitter OAuth connection.';
    if (error instanceof ApiResponseError) {
      errorMessage = `Twitter API Error during login: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    setRedirectError(errorMessage);
    if (agentId && typeof agentId === 'string') {
      await tokenStore.clearTemporaryTokensByAgent(agentId);
    }
  } 

  return NextResponse.redirect(finalRedirectUrl);
} 