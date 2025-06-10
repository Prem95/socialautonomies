import { TwitterApi } from '@/app/api/twitter-api';
import prisma from '@/app/db/utils/dbClient';

/**
 * Check for valid cookies and attempt login
 * - First checks database for valid cookies
 * - If valid cookies exist, attempts to use them
 * - Falls back to username/password login if cookies fail
 * - Saves new cookies to database after successful login
 * 
 * @param userId User ID to find/save cookies for
 * @param username X username
 * @param password X password
 * @returns Authentication result with TwitterApi if successful
 */
export async function authenticateTwitter(
  userId: string,
  username: string,
  password: string
): Promise<{
  authenticated: boolean;
  api?: TwitterApi;
  error?: string;
}> {
  try {
    // Initialize X API
    const api = new TwitterApi({
      username,
      password,
      cookiesPath: './data/cookies.json',
      debug: true,
    });
    
    // Check if we have valid cookies in the database
    const validCookies = await getValidCookiesFromDatabase(userId);
    let loginSuccess = false;
    
    if (validCookies && validCookies.length > 0) {
      console.log(`Found ${validCookies.length} valid cookies for X user ${username}, attempting to use them...`);
      
      // Convert database cookies to the format expected by TwitterApi
      const cookieStrings = formatCookiesForTwitterApi(validCookies);
      console.log('Cookie strings:', cookieStrings);
      // Set cookies in the scraper
      const scraper = api.getScraper();
      await scraper.setCookies(cookieStrings);
      
      // Check if we're logged in
      const isLoggedIn = await scraper.isLoggedIn();
      if (isLoggedIn) {
        console.log(`Successfully logged in as ${username} using database cookies`);
        loginSuccess = true;
      } else {
        console.log('Cookies from database are invalid or expired, will try normal login');
      }
    } else {
      console.log(`No valid cookies found for user ${username}`);
    }
    
    // If we couldn't log in with database cookies, try normal login
    if (!loginSuccess) {
      // Perform normal login
      console.log(`Logging in to X as ${username}...`);
      loginSuccess = await api.login();
      
      if (!loginSuccess) {
        return { 
          authenticated: false, 
          error: 'Failed to login with username/password' 
        };
      }
      
      // Save the new cookies to the database
      try {
        await saveCookiesToDatabase(userId, api);
      } catch (error) {
        console.error('Failed to save cookies to database:', error);
        // Continue anyway since login was successful
      }
    }
    
    return {
      authenticated: true,
      api
    };
  } catch (error) {
    console.error('Error in X authentication:', error);
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Format database cookies for X API
 */
export function formatCookiesForTwitterApi(cookies: any[]): string[] {
  return cookies.map(cookie => 
    `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
      cookie.path || '/'
    }; ${cookie.secure ? 'Secure' : ''}; ${
      cookie.httpOnly ? 'HttpOnly' : ''
    }; SameSite=${cookie.sameSite || 'Lax'}`
  );
}

/**
 * Get valid (non-expired) cookies for a user from the database
 */
export async function getValidCookiesFromDatabase(userId: string): Promise<any[] | null> {
  try {
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
}

/**
 * Save X cookies to the database
 */
export async function saveCookiesToDatabase(userId: string, api: TwitterApi): Promise<void> {
  // Get the scraper to access cookies
  const scraper = api.getScraper();
  const cookies = await scraper.getCookies();
  
  if (!cookies || cookies.length === 0) {
    throw new Error('No cookies available to save');
  }
  
  // Save each cookie to the database
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
    
    // Use upsert to update if exists or create if not
    await prisma.cookie.upsert({
      where: {
        userId_key: {
          userId,
          key: cookie.key
        }
      },
      update: {
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: expiresDate,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite || 'Lax'
      },
      create: {
        userId,
        key: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: expiresDate,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite || 'Lax'
      }
    });
  }
  
  console.log(`Saved ${cookies.length} cookies to database`);
} 