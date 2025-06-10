/**
 * Twitter V2 Service
 * 
 * Provides Twitter API v2 integration for agents using stored OAuth tokens
 */

import { TwitterV2Api } from './twitter-v2-api';
import prisma from '../db/utils/dbClient';

/**
 * Twitter V2 Service
 * Handles the integration with Twitter API v2 for authenticated agents
 */
export const twitterV2Service = {
  /**
   * Get a configured Twitter V2 API client for an agent
   * 
   * @param agentId Agent ID to get Twitter API client for
   * @returns Object with client and authentication status
   */
  async getTwitterClientForAgent(agentId: string): Promise<{
    authenticated: boolean;
    client?: TwitterV2Api;
    error?: string;
  }> {
    try {
      // Get the agent with its Twitter authentication
      const agent = await prisma.agent.findUnique({
        where: { agentId },
        include: { twitterAuth: true }
      });
      
      if (!agent) {
        return {
          authenticated: false,
          error: 'Agent not found'
        };
      }
      
      // Check if agent has Twitter auth
      if (!agent.twitterAuth) {
        return {
          authenticated: false,
          error: 'Agent is not connected to Twitter'
        };
      }
      
      // Check if we have all required tokens
      const { accessToken, accessSecret } = agent.twitterAuth;
      
      if (!accessToken || !accessSecret) {
        return {
          authenticated: false,
          error: 'Missing Twitter authentication tokens'
        };
      }
      
      // Get API key and secret from environment
      const apiKey = process.env.TWITTER_API_KEY;
      const apiSecret = process.env.TWITTER_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        console.error('Missing Twitter API credentials in environment');
        return {
          authenticated: false,
          error: 'Missing Twitter API credentials in environment'
        };
      }
      
      // Create Twitter V2 API client
      const client = new TwitterV2Api({
        accessToken,
        accessSecret,
        apiKey,
        apiSecret,
        debug: process.env.NODE_ENV !== 'production'
      });
      
      return {
        authenticated: true,
        client
      };
      
    } catch (error) {
      console.error('Error creating Twitter V2 API client:', error);
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Post a tweet using Twitter API v2
   * 
   * @param agentId Agent ID to post tweet from
   * @param text Tweet text content
   * @param options Additional tweet options
   * @returns Result of the tweet posting
   */
  async postTweet(
    agentId: string,
    text: string,
    options?: {
      replyToTweetId?: string;
      mediaIds?: string[];
      pollOptions?: string[];
      pollDurationMinutes?: number;
    }
  ): Promise<{
    success: boolean;
    tweetId?: string;
    url?: string;
    timestamp?: Date;
    error?: string;
  }> {
    try {
      // Get Twitter client for agent
      const { authenticated, client, error } = await this.getTwitterClientForAgent(agentId);
      
      if (!authenticated || !client) {
        return {
          success: false,
          error: error || 'Failed to authenticate with Twitter'
        };
      }
      
      console.log(`[Twitter V2 Service] Posting tweet for agent ${agentId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Post the tweet
      const result = await client.postTweet(text, options);
      
      if (result.success && result.tweetId) {
        console.log(`[Twitter V2 Service] Tweet posted successfully. ID: ${result.tweetId}`);
        
        // Save the tweet to the database
        try {
          await prisma.tweet.create({
            data: {
              agentId,
              text,
              twitterTweetId: result.tweetId,
              url: result.url || '',
              postTime: result.timestamp || new Date(),
            }
          });
          
          console.log(`[Twitter V2 Service] Tweet saved to database for agent ${agentId}`);
        } catch (dbError) {
          console.error(`[Twitter V2 Service] Error saving tweet to database:`, dbError);
          // Continue despite database error, as the tweet was posted successfully
        }
      } else {
        console.error(`[Twitter V2 Service] Failed to post tweet:`, result.error);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error posting tweet with Twitter V2 service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Verify Twitter authentication for an agent
   * 
   * @param agentId Agent ID to verify
   * @returns Authentication status and user info if successful
   */
  async verifyAuthentication(agentId: string): Promise<{
    authenticated: boolean;
    user?: {
      id: string;
      username: string;
      name: string;
    };
    error?: string;
  }> {
    try {
      // Get Twitter client for agent
      const { authenticated, client, error } = await this.getTwitterClientForAgent(agentId);
      
      if (!authenticated || !client) {
        return {
          authenticated: false,
          error: error || 'Failed to authenticate with Twitter'
        };
      }
      
      // Get authenticated user to verify credentials
      const userResult = await client.getAuthenticatedUser();
      
      if (!userResult.success || !userResult.user) {
        return {
          authenticated: false,
          error: userResult.error || 'Failed to get authenticated user'
        };
      }
      
      return {
        authenticated: true,
        user: userResult.user
      };
      
    } catch (error) {
      console.error('Error verifying Twitter authentication:', error);
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}; 