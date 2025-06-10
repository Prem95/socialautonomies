/**
 * Twitter API v2 Service
 * 
 * Uses Twitter API v2 for posting tweets using OAuth tokens
 */

import { TwitterApi as TwitterApiV2, TweetV2PostTweetResult } from 'twitter-api-v2';

export interface TwitterV2ApiConfig {
  /**
   * OAuth 1.0a Access Token
   */
  accessToken: string;
  
  /**
   * OAuth 1.0a Access Token Secret
   */
  accessSecret: string;
  
  /**
   * Twitter API Key (Consumer Key)
   */
  apiKey: string;
  
  /**
   * Twitter API Secret (Consumer Secret)
   */
  apiSecret: string;
  
  /**
   * Debug mode - enables verbose logging
   */
  debug?: boolean;
}

/**
 * Twitter API v2 client
 */
export class TwitterV2Api {
  private client: TwitterApiV2;
  private debug: boolean;

  /**
   * Initialize Twitter API v2 client
   */
  constructor(config: TwitterV2ApiConfig) {
    this.debug = config.debug || false;
    
    if (this.debug) {
      console.log('Initializing Twitter API v2 client');
    }
    
    // Create Twitter API v2 client with OAuth 1.0a user authentication
    this.client = new TwitterApiV2({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });
  }

  /**
   * Post a new tweet using Twitter API v2
   * 
   * @param text - Text content of the tweet
   * @param options - Additional options for the tweet
   * @returns Object with success status and tweet details if successful
   */
  public async postTweet(
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
      if (this.debug) {
        console.log(`Posting tweet: "${text}"${options?.replyToTweetId ? ` as reply to ${options.replyToTweetId}` : ''}`);
      }
      
      // Build tweet payload
      const payload: any = {
        text
      };
      
      // Add reply settings if replying to another tweet
      if (options?.replyToTweetId) {
        payload.reply = {
          in_reply_to_tweet_id: options.replyToTweetId
        };
      }
      
      // Add media if provided
      if (options?.mediaIds && options.mediaIds.length > 0) {
        payload.media = {
          media_ids: options.mediaIds
        };
      }
      
      // Add poll if options provided
      if (options?.pollOptions && options.pollOptions.length > 1) {
        payload.poll = {
          options: options.pollOptions,
          duration_minutes: options.pollDurationMinutes || 1440 // Default to 24 hours
        };
      }
      
      if (this.debug) {
        console.log('Tweet payload:', JSON.stringify(payload, null, 2));
      }
      
      // Post the tweet
      const response: TweetV2PostTweetResult = await this.client.v2.tweet(payload);
      
      if (this.debug) {
        console.log('Twitter API v2 response:', response);
      }
      
      // Check if tweet was created successfully
      if (response.data && response.data.id) {
        const tweetId = response.data.id;
        const url = `https://twitter.com/i/web/status/${tweetId}`;
        
        if (this.debug) {
          console.log(`Tweet posted successfully. ID: ${tweetId}, URL: ${url}`);
        }
        
        return {
          success: true,
          tweetId,
          url,
          timestamp: new Date()
        };
      }
      
      throw new Error('Tweet posted but no ID returned');
      
    } catch (error) {
      console.error('Error posting tweet with Twitter API v2:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get authenticated user information
   * 
   * @returns User object with ID and username
   */
  public async getAuthenticatedUser(): Promise<{
    success: boolean;
    user?: {
      id: string;
      username: string;
      name: string;
    };
    error?: string;
  }> {
    try {
      // Get authenticated user using OAuth 1.0a user context
      const response = await this.client.v2.me({
        'user.fields': ['username', 'name']
      });
      
      if (response.data) {
        return {
          success: true,
          user: {
            id: response.data.id,
            username: response.data.username,
            name: response.data.name
          }
        };
      }
      
      return {
        success: false,
        error: 'Could not retrieve authenticated user'
      };
      
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
} 