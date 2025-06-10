import { Scraper, Profile, Tweet } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const fileExists = promisify(fs.exists);

/**
 * X API configuration options
 */
export interface TwitterApiConfig {
  /**
   * Path to store cookies (defaults to './cookies.json')
   */
  cookiesPath?: string;
  
  /**
   * Default username to use for operations
   */
  username?: string;
  
  /**
   * Default password to use for operations
   */
  password?: string;
  
  /**
   * Debug mode - enables verbose logging
   */
  debug?: boolean;
}

/**
 * A class providing a clean API interface for X operations
 */
export class TwitterApi {
  private scraper: Scraper;
  private cookiesPath: string;
  private username?: string;
  private password?: string;
  private debug: boolean;
  
  /**
   * Create a new TwitterApi instance
   * 
   * @param config - Configuration options
   */
  constructor(config: TwitterApiConfig = {}) {
    this.scraper = new Scraper();
    this.cookiesPath = config.cookiesPath || './data/cookies.json';
    this.username = config.username;
    this.password = config.password;
    this.debug = config.debug || false;
  }
  
  /**
   * Load cookies from the file system if they exist
   * 
   * @returns Array of cookie strings or null if no cookies found
   */
  private async loadCookiesFromFile(): Promise<string[] | null> {
    try {
      if (await fileExists(this.cookiesPath)) {
        const cookiesData = await readFile(this.cookiesPath, 'utf-8');
        const cookiesArray = JSON.parse(cookiesData);
        
        if (this.debug) {
          console.log(`Loaded ${cookiesArray.length} cookies from ${this.cookiesPath}`);
        }
        
        // Convert cookie objects to cookie strings in the required format
        const cookieStrings = cookiesArray.map((cookie: any) => {
          // Handle potentially invalid expiration dates
          let expiresStr = '';
          if (cookie.expires && cookie.expires !== 'Infinity' && cookie.expires !== Infinity) {
            try {
              const expDate = new Date(cookie.expires);
              if (!isNaN(expDate.getTime())) {
                expiresStr = `Expires=${expDate.toUTCString()}; `;
              }
            } catch (e) {
              // Skip expires if invalid
            }
          }
          
          return `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
            cookie.path || '/'
          }; ${expiresStr}${cookie.secure ? 'Secure; ' : ''}${
            cookie.httpOnly ? 'HttpOnly; ' : ''
          }SameSite=${cookie.sameSite || 'Lax'}`;
        });
        
        return cookieStrings;
      }
    } catch (error) {
      console.error('Error loading cookies from file:', error);
    }
    
    return null;
  }
  
  /**
   * Save cookies to the file system for future use
   * 
   * @param cookies - Cookies to save
   */
  private async saveCookiesToFile(cookies: Cookie[]): Promise<void> {
    try {
      // Ensure the data directory exists
      await this.ensureDataDirectoryExists();
      
      // Process cookies to handle any invalid fields
      const processedCookies = cookies.map(cookie => {
        const cookieObj = { ...cookie };
        
        // Fix Infinity expiration date
        if ((typeof cookieObj.expires === 'number' && cookieObj.expires === Infinity) || 
            (typeof cookieObj.expires === 'string' && cookieObj.expires === 'Infinity')) {
          // Use a far future date (1 year)
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);
          cookieObj.expires = futureDate;
        }
        
        return cookieObj;
      });
      
      await writeFile(this.cookiesPath, JSON.stringify(processedCookies, null, 2));
      
      if (this.debug) {
        console.log(`Saved ${processedCookies.length} cookies to ${this.cookiesPath}`);
      }
    } catch (error) {
      console.error('Error saving cookies:', error);
    }
  }
  
  /**
   * Login to X with username and password
   * If cookies exist, they will be used instead
   * 
   * @param username - X username
   * @param password - X password
   * @returns True if login successful, false otherwise
   */
  public async login(username?: string, password?: string): Promise<boolean> {
    try {
      // Use provided credentials or fall back to defaults
      const user = username || this.username;
      const pass = password || this.password;
      
      if (!user || !pass) {
        throw new Error('Username and password are required for login');
      }
      
      // Try to load existing cookies
      const cookieStrings = await this.loadCookiesFromFile();
      
      if (cookieStrings && cookieStrings.length > 0) {
        // Use existing cookies
        if (this.debug) {
          console.log('Using existing cookies for authentication');
        }
        
        await this.scraper.setCookies(cookieStrings);
      } else {
        // Login with username and password
        if (this.debug) {
          console.log('No cookies found, logging in with credentials');
        }
        
        await this.scraper.login(user, pass);
        
        // Save the cookies for future use
        const cookies = await this.scraper.getCookies();
        await this.saveCookiesToFile(cookies);
      }
      
      // Verify login was successful
      const isLoggedIn = await this.scraper.isLoggedIn();
      
      if (!isLoggedIn) {
        throw new Error('Failed to log in to X');
      }
      
      if (this.debug) {
        const profile = await this.scraper.me();
        console.log(`Successfully logged in as: ${profile?.username}`);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
  
  /**
   * Fetch tweets from a specified user
   * 
   * @param username - X username to fetch tweets from
   * @param count - Maximum number of tweets to fetch (default: 10)
   * @returns Array of tweets
   */
  public async fetchTweets(username: string, count: number = 10): Promise<Tweet[]> {
    try {
      // Ensure we're logged in first
      const isLoggedIn = await this.scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Call login() first.');
      }
      
      // Get tweets from the account
      const tweetsIterator = this.scraper.getTweets(username, count);
      
      // Collect tweets into an array
      const tweets: Tweet[] = [];
      for await (const tweet of tweetsIterator) {
        tweets.push(tweet);
        if (tweets.length >= count) break;
      }
      
      return tweets;
    } catch (error) {
      console.error('Error fetching tweets:', error);
      return [];
    }
  }
  
  /**
   * Post a new tweet
   * 
   * @param text - Text content of the tweet
   * @param replyToTweetId - Optional tweet ID to reply to
   * @returns Object with success status and tweet details if successful
   */
  public async postTweet(text: string, replyToTweetId?: string): Promise<{
    success: boolean;
    tweetId?: string;
    url?: string;
    timestamp?: Date;
  }> {
    try {
      // Ensure we're logged in first
      const isLoggedIn = await this.scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Call login() first.');
      }
      
      // Send the tweet
      const response = await this.scraper.sendTweet(text, replyToTweetId);

      // Check if the request was successful
      if (!response) {
        console.error('No response from X API');
        return { success: false };
      }

      // The response should be truthy if successful
      const success = !!response;
      
      if (success) {
        console.log('Tweet posted successfully');    
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Error posting tweet:', error);
      return { success: false };
    }
  }
  
  /**
   * Reply to a specific tweet
   * 
   * @param tweetId - ID of the tweet to reply to
   * @param text - Text content of the reply
   * @returns True if reply was posted successfully
   */
  public async replyToTweet(tweetId: string, text: string): Promise<boolean> {
    try {
      // Ensure we're logged in first
      const isLoggedIn = await this.scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Call login() first.');
      }

      if (this.debug) {
        console.log(`Attempting to reply to tweet ${tweetId} with: "${text}"`);
      }
      
      // Send the reply
      const response = await this.scraper.sendTweet(text, tweetId);
      
      if (this.debug) {
        console.log('Reply API response:', response);
      }

      // Check if the request was successful
      if (!response) {
        console.error('No response from X API');
        return false;
      }

      // The response should be truthy if successful
      const success = !!response;
      
      if (success && this.debug) {
        console.log('Reply posted successfully');
      }

      return success;
    } catch (error) {
      console.error('Error posting reply:', error);
      if (this.debug) {
        console.error('Full error details:', error);
      }
      return false;
    }
  }
  
  /**
   * Get the scraper instance for advanced operations
   * 
   * @returns The underlying Scraper instance
   */
  public getScraper(): Scraper {
    return this.scraper;
  }
  
  /**
   * Ensure the data directory exists
   */
  private async ensureDataDirectoryExists(): Promise<void> {
    try {
      const dataDir = path.dirname(this.cookiesPath);
      
      if (!(await fileExists(dataDir))) {
        if (this.debug) {
          console.log(`Creating data directory: ${dataDir}`);
        }
        
        // Create the directory recursively
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  /**
   * Get followers for a specified user
   * 
   * @param username - X username to get followers for
   * @param count - Maximum number of followers to fetch (default: 10)
   * @returns Array of Profile objects
   */
  public async getFollowers(username: string, count: number = 10): Promise<Profile[]> {
    try {
      // Ensure we're logged in first
      const isLoggedIn = await this.scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Call login() first.');
      }
      
      if (this.debug) {
        console.log(`Fetching up to ${count} followers for @${username}`);
      }

      // Get user ID first
      const userId = await this.scraper.getUserIdByScreenName(username);
      
      // Get followers from the account
      const followersIterator = this.scraper.getFollowers(userId, count);
      
      // Collect followers into an array
      const followers: Profile[] = [];
      for await (const follower of followersIterator) {
        followers.push(follower);
        if (followers.length >= count) break;
      }
      
      if (this.debug) {
        console.log(`Fetched ${followers.length} followers for @${username}`);
      }
      
      return followers;
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  }

  /**
   * Get users that a specified user is following
   * 
   * @param username - X username to get following for
   * @param count - Maximum number of following to fetch (default: 10)
   * @returns Array of Profile objects
   */
  public async getFollowing(username: string, count: number = 10): Promise<Profile[]> {
    try {
      // Ensure we're logged in first
      const isLoggedIn = await this.scraper.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Not logged in. Call login() first.');
      }
      
      if (this.debug) {
        console.log(`Fetching up to ${count} following for @${username}`);
      }

      // Get user ID first
      const userId = await this.scraper.getUserIdByScreenName(username);
      
      // Get following from the account
      const followingIterator = this.scraper.getFollowing(userId, count);
      
      // Collect following into an array (using a different variable name to avoid conflict)
      const followingList: Profile[] = [];
      for await (const profile of followingIterator) {
        followingList.push(profile);
        if (followingList.length >= count) break;
      }
      
      if (this.debug) {
        console.log(`Fetched ${followingList.length} following for @${username}`);
      }
      
      return followingList;
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  }
} 