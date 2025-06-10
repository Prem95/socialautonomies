import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, handleError } from '@/app/api/middleware/security';
import { validatePathParams, agentIdParamSchema } from '../../../schemas/validation';
import { TwitterApi as CustomTwitterApiWrapper } from '../../../twitter-api';
import prisma from '@/app/db/utils/dbClient';

interface TweetRequestBody {
  tweet?: {
    text: string;
    replyToTweetId?: string;
    context?: string;
  };
  text?: string;
  replyToTweetId?: string;
  context?: string;
}

export const POST = withSecurity(undefined, false)(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  const agentId = params.id;
  const userId = user?.userId;

  try {
    // Validate path parameters
    const paramValidation = validatePathParams(agentIdParamSchema, params);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramValidation.error },
        { status: 400 }
      );
    }

    // Get agent with necessary fields and verify ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      select: {
        agentId: true,
        name: true,
        userId: true,
        goal: true,
        autoEngageEnabled: true,
        autoEngageFrequencyHours: true,
        autoEngageMaxReplies: true,
        autoEngageMinScore: true,
        autoEngageAutoReply: true,
        lastAutoEngageTime: true,
        twitterAuth: {
          select: {
            twitterScreenName: true
          }
        },
        profile: {
          select: {
            userId: true,
            planId: true,
            profileCreatedAt: true,
            customGenerationsUsed: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }
    
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: `Agent ${agentId} does not belong to user ${userId}` },
        { status: 403 }
      );
    }

    // Parse request body
    const body: TweetRequestBody = await request.json();
    const tweetObj = body.tweet || body;
    const text = tweetObj.text || body.text;
    const replyToTweetId = tweetObj.replyToTweetId || body.replyToTweetId;
    const context = tweetObj.context || body.context;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: "'text' is required and must be a string" 
        },
        { status: 400 }
      );
    }

    // Get valid cookies for the user
    const validCookies = await prisma.cookie.findMany({
      where: {
        userId,
        OR: [
          { expires: null },
          { expires: { gt: new Date() } }
        ]
      }
    });

    if (!validCookies || validCookies.length === 0) {
      return NextResponse.json({
        error: "Twitter authentication required",
        details: "No valid cookies found. Please add your Twitter cookies."
      }, { status: 401 });
    }

    // Initialize Twitter API wrapper
    const api = new CustomTwitterApiWrapper({
      cookiesPath: './data/cookies.json',
      debug: process.env.NODE_ENV !== 'production'
    });

    // Convert cookies to cookie strings
    const cookieStrings = validCookies.map(cookie => 
      `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
        cookie.path || '/'
      }; ${cookie.secure ? 'Secure' : ''}; ${
        cookie.httpOnly ? 'HttpOnly' : ''
      }; SameSite=${cookie.sameSite || 'Lax'}`
    );

    const scraper = api.getScraper();
    await scraper.setCookies(cookieStrings);
    
    // Verify authentication
    const isLoggedIn = await scraper.isLoggedIn();
    if (!isLoggedIn) {
      return NextResponse.json({
        error: "X Authentication Failed",
        details: "Stored cookies appear to be invalid or expired."
      }, { status: 401 });
    }

    // Post the tweet
    let tweetResponse;
    try {
      if (replyToTweetId) {
        tweetResponse = await scraper.sendTweet(text, replyToTweetId);
      } else {
        tweetResponse = await scraper.sendTweet(text);
      }
      
      const responseText = await tweetResponse.text();
      const responseData = JSON.parse(responseText);
      
      if (!responseData?.data?.create_tweet?.tweet_results?.result?.rest_id) {
        return NextResponse.json({
          error: "Failed to extract tweet ID from response",
          details: "Twitter API response structure was not as expected"
        }, { status: 500 });
      }
      
      const tweetId = responseData.data.create_tweet.tweet_results.result.rest_id;
      const timestamp = new Date();
      
      // Get user info for URL construction
      const me = await scraper.me();
      const username = me?.username || 'user';
      const url = `https://twitter.com/${username}/status/${tweetId}`;
      
      // Save tweet to database
      const savedTweet = await prisma.tweet.upsert({
        where: {
          twitterTweetId: tweetId
        },
        update: {
          agentId,
          text,
          postTime: timestamp,
          url,
          context: context || null
        },
        create: {
          agentId,
          text,
          postTime: timestamp,
          twitterTweetId: tweetId,
          url,
          context: context || null
        }
      });
      
      return NextResponse.json({
        success: true,
        message: "Tweet posted successfully",
        tweet: {
          dbId: savedTweet.tweetId,
          twitterId: tweetId,
          url,
          text,
          postedAt: timestamp
        }
      }, { status: 201 });
      
    } catch (error) {
      console.error(`Error posting tweet for agent ${agentId}:`, error);
      return NextResponse.json({
        error: "Failed to post tweet",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error(`Error processing post tweet request for agent ${agentId}:`, error);
    return handleError(error, `Post Tweet Agent ${agentId}`);
  }
}); 