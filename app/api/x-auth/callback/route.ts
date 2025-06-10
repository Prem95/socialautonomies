import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TwitterApi, ApiResponseError } from 'twitter-api-v2'
import { TWITTER_API_KEY, TWITTER_API_SECRET, NEXT_PUBLIC_APP_URL } from '@/app/config/env'
import prisma from '@/app/db/utils/dbClient'

// Use the imported variables
const appKey = TWITTER_API_KEY
const appSecret = TWITTER_API_SECRET
const appUrl = NEXT_PUBLIC_APP_URL

// Define the URL to redirect back to the dashboard
const REDIRECT_PAGE_URL = `${appUrl}/dashboard/agents`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const oauth_token    = searchParams.get('oauth_token')
  const oauth_verifier = searchParams.get('oauth_verifier')
  const denied         = searchParams.get('denied')
  const agentId        = searchParams.get('agentId')
  // Retrieve oauth_secret from database instead of cookies
  let oauth_secret: string | null = null
  
  if (oauth_token) {
    try {
      const tempToken = await prisma.temporaryOAuthToken.findFirst({
        where: {
          oauthToken: oauth_token,
          expiresAt: { gt: new Date() } // Not expired
        }
      })
      
      if (tempToken) {
        oauth_secret = tempToken.oauthTokenSecret
        console.log(`[OAuth Callback] Found OAuth secret for token: ${oauth_token.substring(0,5)}...`)
        
        // Clean up the temporary token since we're using it now
        await prisma.temporaryOAuthToken.delete({
          where: { id: tempToken.id }
        })
      } else {
        console.log(`[OAuth Callback] No valid OAuth secret found for token: ${oauth_token.substring(0,5)}...`)
      }
    } catch (dbError) {
      console.error('[OAuth Callback] Error retrieving OAuth secret from database:', dbError)
    }
  }

  // Construct redirect URLs
  let redirectUrl = new URL(REDIRECT_PAGE_URL)

  // Handle user denying access
  if (denied) {
      console.warn(`[OAuth Callback] User denied access. Token: ${denied}`)
      redirectUrl.searchParams.set('oauth_error', 'User denied access')
      return NextResponse.redirect(redirectUrl)
  }

  // Validate parameters
  if (!oauth_token || !oauth_verifier || !oauth_secret || !agentId) {
    console.error('[OAuth Callback] Missing parameters:', { 
      oauth_token: !!oauth_token, 
      oauth_verifier: !!oauth_verifier, 
      oauth_secret: !!oauth_secret,
      agentId: !!agentId 
    })
    const msg = 'OAuth callback parameters missing or invalid.'
    redirectUrl.searchParams.set('oauth_error', msg)
    return NextResponse.redirect(redirectUrl)
  }

  // Initialize client with temporary tokens
  const client = new TwitterApi({
    appKey:      appKey!,
    appSecret:   appSecret!,
    accessToken: oauth_token,
    accessSecret: oauth_secret,
  })

  try {
    console.log(`[OAuth Callback] Attempting login for token: ${oauth_token.substring(0,5)}...`)
    
    // Exchange temporary tokens for permanent ones
    const { client: userClient, accessToken, accessSecret, screenName, userId } =
      await client.login(oauth_verifier)

    console.log(`[OAuth Callback] Success! User @${screenName} (ID: ${userId}) logged in.`)
    console.log(`[OAuth Callback] Access Token: ${accessToken.substring(0,5)}...`) // Log only prefix in production
    
    // Save the Twitter auth tokens to the database for this agent
    try {
      await prisma.twitterAuth.upsert({
        where: { agentId },
        update: {
          accessToken,
          accessSecret,
          twitterUserId: userId,
          twitterUsername: screenName,
          isActive: true
        },
        create: {
          agentId,
          accessToken,
          accessSecret,
          twitterUserId: userId,
          twitterUsername: screenName,
          isActive: true
        }
      })
      console.log(`[OAuth Callback] Twitter auth saved for agent ${agentId}, user @${screenName}`)
         } catch (dbError) {
       console.error("[OAuth Callback] Error saving Twitter auth to database:", dbError)
       redirectUrl.searchParams.set('oauth_error', 'Failed to save authentication')
       return NextResponse.redirect(redirectUrl)
     }

    // Redirect back to the dashboard indicating success
    redirectUrl.searchParams.set('oauth_success', 'true')
    redirectUrl.searchParams.set('agentId', agentId)
    redirectUrl.searchParams.set('twitterUsername', screenName)
    
         // Redirect back to dashboard with success
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('[OAuth Callback] Login Error:', error)
     let errorMessage = 'Failed to complete Twitter login.'
     if (error instanceof ApiResponseError) {
        const detail = error.data?.detail ?? `Twitter API error code ${error.code}`
        errorMessage = `Twitter API Error (${error.code}): ${detail}`
        console.error("[OAuth Callback] Twitter API Error Data:", JSON.stringify(error.data, null, 2))
     } else if (error instanceof Error) {
        errorMessage = error.message
     }
    redirectUrl.searchParams.set('oauth_error', errorMessage)
    return NextResponse.redirect(redirectUrl)
  }
} 