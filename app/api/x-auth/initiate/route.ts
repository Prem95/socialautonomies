import { NextResponse } from 'next/server'
import { TwitterApi, ApiResponseError } from 'twitter-api-v2'
import { TWITTER_API_KEY, TWITTER_API_SECRET, NEXT_PUBLIC_APP_URL } from '@/app/config/env'
import prisma from '@/app/db/utils/dbClient'

export const dynamic = 'force-dynamic';

// Load environment variables from centralized config
const appKey = TWITTER_API_KEY
const appSecret = TWITTER_API_SECRET
const appUrl = NEXT_PUBLIC_APP_URL

// Check variables once at module load, but throw if missing for critical config
if (!appKey || !appSecret || !appUrl) {
  console.error("FATAL ERROR: Missing TWITTER_API_KEY, TWITTER_API_SECRET, or NEXT_PUBLIC_APP_URL in .env")
  throw new Error("Server configuration error: Required Twitter API credentials or App URL are missing."); 
}

const client = new TwitterApi({
  appKey: appKey,
  appSecret: appSecret,
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    const CALLBACK_URL = `${appUrl}/api/x-auth/callback?agentId=${agentId}`
    console.log(`[OAuth Initiate] Generating link with callback: ${CALLBACK_URL}`)
    
    const { url: authUrl, oauth_token, oauth_token_secret } = 
      await client.generateAuthLink(CALLBACK_URL, { linkMode: 'authorize' })

    // Store the oauth_token_secret temporarily in database instead of cookies
    console.log(`[OAuth Initiate] Storing secret for token: ${oauth_token.substring(0,5)}...`)
    
    // Clean up any existing temporary tokens for this agent
    await prisma.temporaryOAuthToken.deleteMany({
      where: { 
        OR: [
          { agentId },
          { createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } } // Clean up tokens older than 15 minutes
        ]
      }
    })
    
    // Store the new temporary token
    await prisma.temporaryOAuthToken.create({
      data: {
        agentId,
        oauthToken: oauth_token,
        oauthTokenSecret: oauth_token_secret,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // Expires in 10 minutes
      }
    })

    return NextResponse.json({ authUrl })

  } catch (error) {
    console.error("[OAuth Initiate] Error:", error)
    let errorMessage = 'Failed to initiate Twitter OAuth flow.'
    
    if (error instanceof ApiResponseError) {
        const detail = error.data?.detail ?? `Twitter API error code ${error.code}`;
        errorMessage = `Twitter API Error (${error.code}): ${detail}`;
        console.error("[OAuth Initiate] Twitter API Error Data:", JSON.stringify(error.data, null, 2));
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 