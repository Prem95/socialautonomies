/**
 * X Authentication Service
 * 
 * Handles X authentication flows and cookie management
 */

import { TwitterApi as CustomTwitterApiWrapper } from './twitter-api';
import prisma from '../db/utils/dbClient';

/**
 * X Authentication Service
 */
export const twitterAuthService = {
  /**
   * Verify X authentication for a user
   * First checks for valid cookies, then tries login if needed
   * 
   * @param userId User ID to check authentication for
   * @param username X username (usually from agent.name)
   * @returns Object with authentication status and the X API instance
   */
  async verifyAuthentication(userId: string, username: string): Promise<{
    authenticated: boolean;
    api?: CustomTwitterApiWrapper;
    error?: string;
  }> {
    try {
      // Initialize the X API
      const api = new CustomTwitterApiWrapper({
        username,
        debug: true
      });
      
      // First check for valid cookies
      const cookies = await this.getValidCookiesFromDatabase(username);
      console.log('Cookies:', cookies);
      let loginSuccess = false;
      
      if (cookies && cookies.length > 0) {
        console.log(`Found ${cookies.length} valid cookies for user ${username}, attempting to use them...`);
        
        // Convert database cookies to the format expected by TwitterApi
        const cookieStrings = cookies.map(cookie => 
          `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
            cookie.path || '/'
          }; ${cookie.secure ? 'Secure' : ''}; ${
            cookie.httpOnly ? 'HttpOnly' : ''
          }; SameSite=${cookie.sameSite || 'Lax'}`
        );
        
        // Set cookies in the scraper
        const scraper = api.getScraper();
        await scraper.setCookies(cookieStrings);
        
        // Check if we're logged in
        const isLoggedIn = await scraper.isLoggedIn();
        if (isLoggedIn) {
          console.log(`Successfully authenticated with X for ${username} using cookies`);
          loginSuccess = true;
        } else {
          console.log('Cookies are invalid or expired. Please reconnect your X account with cookies. ');
        }
      } else {
        console.log(`No valid cookies found for user ${username}`);
      }
      
      // If cookies didn't work and we have credentials, try normal login
      if (!loginSuccess) {
        console.log(`Attempting to login with username/password for ${username}`);
        loginSuccess = await api.login();
        
        if (loginSuccess) {
          console.log(`Successfully authenticated with X for ${username} using credentials`);
          
          // Save the new cookies to the database
          try {
            await this.saveCookiesToDatabase(userId, api);
            console.log('X cookies saved to database successfully');
          } catch (error) {
            console.error('Failed to save cookies to database:', error);
            // Continue anyway since login was successful
          }
        } else {
          return {
            authenticated: false,
            error: 'Failed to authenticate with X using username/password'
          };
        }
      }
      
      return {
        authenticated: loginSuccess,
        api: loginSuccess ? api : undefined,
        error: loginSuccess ? undefined : 'Failed to authenticate with X'
      };
      
    } catch (error) {
      console.error('Error verifying X authentication:', error);
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Gets valid (non-expired) cookies for a user from the database
   * @param username X username
   * @returns Array of valid cookies or null if none found
   */
  async getValidCookiesFromDatabase(username: string): Promise<any[] | null> {
    try {
      // First find the profile for this user
      let profile = await prisma.profile.findFirst({
        include: {
          agents: {
            where: {
              name: username
            }
          }
        }
      });
      
      // If we don't have a profile or the relevant agent, return null
      if (!profile || profile.agents.length === 0) {
        return null;
      }
      
      const userId = profile.userId;
      
      // Get non-expired cookies for this user
      const currentDate = new Date();
      const cookies = await prisma.cookie.findMany({
        where: {
          userId,
          OR: [
            { expires: null },  // No expiration
            { expires: { gt: currentDate } }  // Not expired yet
          ]
        }
      });
      
      if (cookies.length === 0) {
        return null;
      }
      
      return cookies;
    } catch (error) {
      console.error('Error getting cookies from database:', error);
      return null;
    }
  },
  
  /**
   * Gets X profile information for a username using stored cookies for authentication
   * 
   * @param userId User ID for cookie lookup
   * @param targetUsername X username to fetch profile for
   * @returns X profile data or error
   */
  async getTwitterProfile(userId: string, targetUsername: string): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
  }> {
    try {

      const validCookies = await prisma.cookie.findMany({
        where: {
          userId,
          OR: [
            { expires: null },  // No expiration
            { expires: { gt: new Date() } }  // Not expired yet
          ]
        }
      });

      if (!validCookies || validCookies.length === 0) {
        return {
          success: false,
          error: 'No valid X session found'
        };
      }

      // Convert database cookies to the format expected by TwitterApi
      const cookieStrings = validCookies.map((cookie: any) => 
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      // Initialize X API without credentials
      const api = new CustomTwitterApiWrapper({
        cookiesPath: './data/cookies.json',
        debug: false,
      });

      // Set cookies in the scraper
      const scraper = api.getScraper();
      await scraper.setCookies(cookieStrings);
      
      // Verify login status
      const isLoggedIn = await scraper.isLoggedIn();
      
      if (!isLoggedIn) {
        return {
          success: false,
          error: 'X session is invalid'
        };
      }
      
      // Get profile information
      const profile = await scraper.getProfile(targetUsername);
      
      if (!profile) {
        return {
          success: false,
          error: 'X profile not found'
        };
      }

      return {
        success: true,
        profile: {
          username: profile.username,
          tweetsCount: profile.tweetsCount || 0,
          followersCount: profile.followersCount || 0,
          followingCount: profile.followingCount || 0,
          likesCount: profile.likesCount || 0
        }
      };
    } catch (error) {
      console.error('Error fetching X profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Save cookies from a X API instance to the database
   * 
   * @param userId User ID to save cookies for
   * @param api TwitterApi instance with valid cookies
   */
  async saveCookiesToDatabase(userId: string, api: CustomTwitterApiWrapper): Promise<void> {
    try {
      // Get the scraper to access cookies
      const scraper = api.getScraper();
      const cookies = await scraper.getCookies();
      
      if (!cookies || cookies.length === 0) {
        throw new Error('No cookies available to save');
      }
      
      // Get user profile to retrieve username for identification
      const profile = await scraper.me();
      
      // Ensure the profile exists in our database
      const profileExists = await prisma.profile.findUnique({
        where: { userId }
      });
      
      if (!profileExists) {
        console.warn(`No profile found for user ID ${userId}, cookies may not be properly associated.`);
      }
      
      // Save each cookie to the database
      const savedCookies = [];
      
      for (const cookie of cookies) {
        // Check if the expires timestamp is valid before creating a Date
        let expiresDate = null;
        if (cookie.expires) {
          // Make sure it's a valid timestamp before creating the Date object
          const timestamp = new Date(cookie.expires).getTime();
          if (!isNaN(timestamp) && timestamp > 0) {
            expiresDate = new Date(timestamp);
          }
        }
        
        const cookieData = {
          userId,
          key: cookie.key,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: expiresDate,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite || 'Lax'
        };
        
        // Use upsert to update if exists or create if not
        const savedCookie = await prisma.cookie.upsert({
          where: {
            userId_key: {
              userId,
              key: cookie.key
            }
          },
          update: cookieData,
          create: cookieData
        });
        
        savedCookies.push(savedCookie);
      }
      
      if (profile) {
        console.log(`Saved ${savedCookies.length} cookies to database for X user @${profile.username}`);
      } else {
        console.log(`Saved ${savedCookies.length} cookies to database for user ID ${userId}`);
      }
    } catch (error) {
      console.error('Error saving cookies to database:', error);
      throw error;
    }
  },

  /**
   * Gets public analytics (metrics) for a specific tweet using the Scraper (Cookie-based)
   * Relies on the user's cookie session. May not provide private/organic metrics.
   *
   * @param userId User ID for cookie lookup
   * @param twitterTweetId X tweet ID to fetch analytics for
   * @returns Object with public tweet analytics data or error
   */
  async getTweetAnalyticsScraper(userId: string, twitterTweetId: string): Promise<{
    success: boolean;
    analytics?: {
      likes: number;
      retweets: number;
      replies: number;
      quote_count: number;
    };
    error?: string;
    errorDetails?: any;
  }> {
    console.log(`[Analytics Service Scraper] Fetching analytics for Tweet ID: ${twitterTweetId}, User: ${userId}`);
    try {
      console.log(`[Analytics Service Scraper] Checking database for valid cookies for userId: ${userId}`);
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
        console.log(`[Analytics Service Scraper] No valid cookies found for userId: ${userId}`);
        return { success: false, error: 'No valid X session found for user.' };
      }
      console.log(`[Analytics Service Scraper] Found ${validCookies.length} valid cookies for userId: ${userId}.`);

      // 2. Convert cookies
      const cookieStrings = validCookies.map((cookie: any) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      // 3. Initialize the scraper wrapper
      const api = new CustomTwitterApiWrapper({ debug: false });
      const scraper = api.getScraper();

      // 4. Set cookies and verify login
      console.log(`[Analytics Service Scraper] Setting cookies and verifying login for userId: ${userId}`);
      await scraper.setCookies(cookieStrings);
      const isLoggedIn = await scraper.isLoggedIn();

      if (!isLoggedIn) {
        console.warn(`[Analytics Service Scraper] Scraper login check failed for userId: ${userId} using database cookies.`);
        return { success: false, error: 'X session is invalid or expired.' };
      }
      console.log(`[Analytics Service Scraper] Scraper login successful for userId: ${userId}.`);

      // 5. Fetch tweet using getTweet via scraper (relies on cookie session)
      console.log(`[Analytics Service Scraper] Fetching Tweet ${twitterTweetId} via scraper.getTweet()`);
      const tweetData = await scraper.getTweet(twitterTweetId);

      if (!tweetData) {
        console.warn(`[Analytics Service Scraper] Tweet ${twitterTweetId} not found via scraper.`);
        return { success: false, error: `Tweet ${twitterTweetId} not found or inaccessible via scraper.` };
      }

      // 6. Extract metrics from the standard Tweet object returned by getTweet
      console.log(`[Analytics Service Scraper] Tweet Data Received for ${twitterTweetId}:`, tweetData); // Log to see available fields

      const likes = tweetData.likes ?? 0;
      const retweets = tweetData.retweets ?? 0;
      const replies = tweetData.replies ?? 0;
      const quote_count = tweetData.quotedStatus ? 1 : 0; // Check if it's a quoted tweet

      return {
        success: true,
        analytics: {
          likes,
          retweets,
          replies,
          quote_count,
          // Views are generally not available reliably through this method
        }
      };

    } catch (error: any) {
      console.error(`[Analytics Service Scraper - CATCH BLOCK] Tweet ID: ${twitterTweetId}, Error:`, error);
      let errorMessage = 'Failed to fetch tweet analytics via scraper';
       if (error.message?.includes('Could not find tweet') || error.status === 404) { // Check status code if available on error
           errorMessage = `Tweet ${twitterTweetId} not found via scraper.`;
       } else if (error.status === 401 || error.status === 403) {
           errorMessage = 'Authentication/Authorization issue with scraper session.';
       }
      return {
        success: false,
        error: errorMessage,
        errorDetails: error.message || String(error)
      };
    }
  },

  /**
   * Gets the home timeline for a user using cookie-based authentication
   * Fetches tweets from accounts the user follows (Following feed)
   * 
   * @param userId User ID for cookie lookup
   * @param count Number of tweets to fetch (default: 20)
   * @param seenTweetIds Array of tweet IDs already seen (for pagination)
   * @returns Timeline tweets or error
   */
  async getHomeTimeline(userId: string, count: number = 20, 
                       requestedSeenTweetIds: string[] = [] // Renamed for clarity
                      ): Promise<{
    success: boolean;
    tweets?: any[];
    error?: string;
    errorDetails?: any;
  }> {
    console.log(`[Timeline Service] Fetching home timeline for User: ${userId}, Count: ${count}`);
    try {
      console.log(`[Timeline Service] Checking database for valid cookies for userId: ${userId}`);
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
        console.log(`[Timeline Service] No valid cookies found for userId: ${userId}`);
        return { success: false, error: 'No valid X session found for user.' };
      }
      console.log(`[Timeline Service] Found ${validCookies.length} valid cookies for userId: ${userId}.`);

      // Convert cookies
      const cookieStrings = validCookies.map((cookie: any) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      // Initialize the scraper wrapper
      const api = new CustomTwitterApiWrapper({ debug: false });
      const scraper = api.getScraper();

      // Set cookies and verify login
      console.log(`[Timeline Service] Setting cookies and verifying login for userId: ${userId}`);
      await scraper.setCookies(cookieStrings);
      const isLoggedIn = await scraper.isLoggedIn();

      if (!isLoggedIn) {
        console.warn(`[Timeline Service] Scraper login check failed for userId: ${userId} using database cookies.`);
        return { success: false, error: 'X session is invalid or expired.' };
      }
      console.log(`[Timeline Service] Scraper login successful for userId: ${userId}.`);

      // Fetch home timeline using fetchHomeTimeline (For You feed)
      let seenTweetsForCurrentAttempt = [...requestedSeenTweetIds]; // Use a copy for modification
      console.log(`[Timeline Service] Initial attempt to fetch home timeline for userId: ${userId} with ${seenTweetsForCurrentAttempt.length} seen IDs, Count: ${count}`);
      let timelineData = await scraper.fetchHomeTimeline(count, seenTweetsForCurrentAttempt);

      // If no data was fetched AND the initial request was for a specific page (i.e., requestedSeenTweetIds was not empty)
      // then attempt a refresh by fetching from the top.
      if ((!timelineData || timelineData.length === 0) && requestedSeenTweetIds.length > 0) {
        console.log(`[Timeline Service] No data found with ${requestedSeenTweetIds.length} seen IDs. Attempting a refresh (fetching from top) for User: ${userId}, Count: ${count}.`);
        seenTweetsForCurrentAttempt = []; // Reset to fetch from the top
        timelineData = await scraper.fetchHomeTimeline(count, seenTweetsForCurrentAttempt);
      }

      if (!timelineData || timelineData.length === 0) {
        console.warn(`[Timeline Service] No timeline data found for userId: ${userId} (after potential refresh attempt).`);
        return { success: false, error: 'No timeline data found.' };
      }

      console.log(`[Timeline Service] Successfully fetched ${timelineData.length} timeline entries for userId: ${userId}`);

      // Process the timeline data to extract useful information
      const processedTweets = timelineData
        .map(tweet => {
          if (!tweet || !tweet.legacy) return null;
          
          return {
            id: tweet.rest_id,
            text: tweet.legacy.full_text,
            createdAt: tweet.legacy.created_at,
            user: tweet.core?.user_results?.result?.legacy ? {
              id: tweet.core.user_results.result.legacy.id_str,
              name: tweet.core.user_results.result.legacy.name,
              screenName: tweet.core.user_results.result.legacy.screen_name,
              profileImageUrl: tweet.core.user_results.result.legacy.profile_image_url_https,
              verified: tweet.core.user_results.result.is_blue_verified
            } : null,
            replyCount: tweet.legacy.reply_count,
            retweetCount: tweet.legacy.retweet_count,
            favoriteCount: tweet.legacy.favorite_count,
            isRetweet: !!tweet.legacy.retweeted_status_result,
            isReply: !!tweet.legacy.in_reply_to_status_id_str,
            mediaEntities: tweet.legacy.extended_entities?.media || []
          };
        })
        .filter(Boolean); // Filter out any null values

      return {
        success: true,
        tweets: processedTweets
      };

    } catch (error: any) {
      console.error(`[Timeline Service - CATCH BLOCK] User ID: ${userId}, Error:`, error);
      let errorMessage = 'Failed to fetch home timeline';
      if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication/Authorization issue with scraper session.';
      }
      return {
        success: false,
        error: errorMessage,
        errorDetails: error.message || String(error)
      };
    }
  },

  /**
   * Gets the following timeline for a user using cookie-based authentication
   * Fetches tweets from accounts the user follows (Following feed)
   * 
   * @param userId User ID for cookie lookup
   * @param count Number of tweets to fetch (default: 20)
   * @param seenTweetIds Array of tweet IDs already seen (for pagination)
   * @returns Timeline tweets or error
   */
  async getFollowingTimeline(userId: string, count: number = 20, seenTweetIds: string[] = []): Promise<{
    success: boolean;
    tweets?: any[];
    error?: string;
    errorDetails?: any;
  }> {
    console.log(`[Following Timeline Service] Fetching following timeline for User: ${userId}, Count: ${count}`);
    try {
      console.log(`[Following Timeline Service] Checking database for valid cookies for userId: ${userId}`);
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
        console.log(`[Following Timeline Service] No valid cookies found for userId: ${userId}`);
        return { success: false, error: 'No valid X session found for user.' };
      }
      console.log(`[Following Timeline Service] Found ${validCookies.length} valid cookies for userId: ${userId}.`);

      // Convert cookies
      const cookieStrings = validCookies.map((cookie: any) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      // Initialize the scraper wrapper
      const api = new CustomTwitterApiWrapper({ debug: false });
      const scraper = api.getScraper();

      // Set cookies and verify login
      console.log(`[Following Timeline Service] Setting cookies and verifying login for userId: ${userId}`);
      await scraper.setCookies(cookieStrings);
      const isLoggedIn = await scraper.isLoggedIn();

      if (!isLoggedIn) {
        console.warn(`[Following Timeline Service] Scraper login check failed for userId: ${userId} using database cookies.`);
        return { success: false, error: 'X session is invalid or expired.' };
      }
      console.log(`[Following Timeline Service] Scraper login successful for userId: ${userId}.`);

      // Fetch following timeline using fetchFollowingTimeline
      console.log(`[Following Timeline Service] Fetching following timeline for userId: ${userId}`);
      const timelineData = await scraper.fetchFollowingTimeline(count, seenTweetIds);

      if (!timelineData || timelineData.length === 0) {
        console.warn(`[Following Timeline Service] No timeline data found for userId: ${userId}`);
        return { success: false, error: 'No timeline data found.' };
      }

      console.log(`[Following Timeline Service] Successfully fetched ${timelineData.length} timeline entries for userId: ${userId}`);

      // Process the timeline data to extract useful information
      const processedTweets = timelineData
        .map(tweet => {
          if (!tweet || !tweet.legacy) return null;
          
          return {
            id: tweet.rest_id,
            text: tweet.legacy.full_text,
            createdAt: tweet.legacy.created_at,
            user: tweet.core?.user_results?.result?.legacy ? {
              id: tweet.core.user_results.result.legacy.id_str,
              name: tweet.core.user_results.result.legacy.name,
              screenName: tweet.core.user_results.result.legacy.screen_name,
              profileImageUrl: tweet.core.user_results.result.legacy.profile_image_url_https,
              verified: tweet.core.user_results.result.is_blue_verified
            } : null,
            replyCount: tweet.legacy.reply_count,
            retweetCount: tweet.legacy.retweet_count,
            favoriteCount: tweet.legacy.favorite_count,
            isRetweet: !!tweet.legacy.retweeted_status_result,
            isReply: !!tweet.legacy.in_reply_to_status_id_str,
            mediaEntities: tweet.legacy.extended_entities?.media || []
          };
        })
        .filter(Boolean); // Filter out any null values

      return {
        success: true,
        tweets: processedTweets
      };

    } catch (error: any) {
      console.error(`[Following Timeline Service - CATCH BLOCK] User ID: ${userId}, Error:`, error);
      let errorMessage = 'Failed to fetch following timeline';
      if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication/Authorization issue with scraper session.';
      }
      return {
        success: false,
        error: errorMessage,
        errorDetails: error.message || String(error)
      };
    }
  },

  /**
   * Gets the current authenticated user's X profile
   * 
   * @param userId User ID for cookie lookup
   * @returns X profile data or error
   */
  async getCurrentUserProfile(userId: string): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
    promptType?: string;
    agentId?: string;
  }> {
    try {
      console.log(`[getCurrentUserProfile] Checking database for valid cookies for userId: ${userId}`);
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
        console.log(`[getCurrentUserProfile] No valid cookies found in database for userId: ${userId}`);
        
        // Instead of trying to extract cookies automatically, trigger the credential prompt
        return await this.triggerCredentialPromptAndExtraction(userId);
      }
      
      // Add Log: Indicate cookies were found
      console.log(`[getCurrentUserProfile] Found ${validCookies.length} valid cookies in database for userId: ${userId}. Proceeding with authentication.`);

      // Convert database cookies to the format expected by TwitterApi
      const cookieStrings = validCookies.map((cookie: any) => 
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
          cookie.path || '/'
        }; ${cookie.secure ? 'Secure' : ''}; ${
          cookie.httpOnly ? 'HttpOnly' : ''
        }; SameSite=${cookie.sameSite || 'Lax'}`
      );

      // Initialize X API without credentials
      const api = new CustomTwitterApiWrapper({
        cookiesPath: './data/cookies.json',
        debug: false, // Set to true for more detailed scraper logs if needed
      });

      // Set cookies in the scraper
      // Add Log: Indicate setting cookies on scraper
      console.log(`[getCurrentUserProfile] Setting ${cookieStrings.length} cookie strings onto scraper for userId: ${userId}`);
      const scraper = api.getScraper();
      await scraper.setCookies(cookieStrings);
      
      // Verify login status
      // Add Log: Indicate checking login status
      console.log(`[getCurrentUserProfile] Verifying scraper login status for userId: ${userId}`);
      const isLoggedIn = await scraper.isLoggedIn();
      
      if (!isLoggedIn) {
        // Add Log: Indicate login failed
        console.warn(`[getCurrentUserProfile] Scraper login check failed for userId: ${userId} using database cookies.`);
        return {
          success: false,
          error: 'X session is invalid'
        };
      }
        
      const profile = await scraper.me();
      
      if (!profile) {
        return {
          success: false,
          error: 'Failed to retrieve current X profile'
        };
      }

      return {
        success: true,
        profile: {
          username: profile.username,
          tweetsCount: profile.tweetsCount || 0,
          followersCount: profile.followersCount || 0,
          followingCount: profile.followingCount || 0,
          likesCount: profile.likesCount || 0
        }
      };
    } catch (error) {
      console.error(`[getCurrentUserProfile] Error fetching profile for userId ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Triggers cookie extraction flow via dialog prompt for user credentials
   * 
   * @param userId User ID for which to extract cookies
   * @param agentId Optional agent ID to associate with the extraction
   * @returns Success status and extracted cookies if successful
   */
  async triggerCredentialPromptAndExtraction(userId: string, agentId?: string): Promise<{
    success: boolean;
    profile?: any;
    error?: string;
    promptType?: string;
    agentId?: string;
  }> {
    try {
      // Find an agent if not provided
      if (!agentId) {
        const agent = await prisma.agent.findFirst({
          where: { userId },
          select: { agentId: true, name: true }
        });
        
        if (agent) {
          agentId = agent.agentId;
        }
      }
      
      if (!agentId) {
        console.error(`No agent found for user ${userId}, cannot trigger credential prompt`);
        return {
          success: false,
          error: 'No Twitter agent found for user'
        };
      }
      
      // Return a special response that will trigger the frontend to show a credential prompt
      return {
        success: false,
        error: 'CREDENTIALS_REQUIRED',
        promptType: 'twitter_credentials',
        agentId
      };
    } catch (error) {
      console.error(`Error triggering credential prompt: ${error}`);
      return {
        success: false,
        error: 'Failed to prepare credential collection'
      };
    }
  }
}; 