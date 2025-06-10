import { Scraper } from '../scraper';
import { Cookie } from 'tough-cookie';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Warning: Could not find .env file, environment variables may not be loaded');
}

async function main() {
  // Define the path to your cookie file
  const cookieFilePath = path.resolve(__dirname, '../../cookies/socagentic_cookies.txt'); // Adjusted path
  const saveCookiesDir = path.resolve(__dirname, '../../saved_cookies'); // New folder for saving cookies
  let toughCookies: Cookie[] = [];

  // Create the directory if it doesn't exist
  if (!fs.existsSync(saveCookiesDir)) {
    fs.mkdirSync(saveCookiesDir, { recursive: true });
  }

  // Define the target domain outside the try block for broader scope
  const targetDomain = 'twitter.com'; // Update target domain to x.com

  // --- Load and Process Cookies ---
  if (fs.existsSync(cookieFilePath)) {
    try {
      const cookieJsonString = fs.readFileSync(cookieFilePath, 'utf-8');
      const cookieData: any[] = JSON.parse(cookieJsonString); // Array of CDP cookie dicts

      // Convert CDP format (from file) to tough-cookie format
      toughCookies = cookieData.map((cdpCookie: any) => {
        // Basic validation
        if (!cdpCookie.name || typeof cdpCookie.value === 'undefined') {
          return null; // Skip this cookie
        }

        const cookieDomain = cdpCookie.domain || '';
        const normalizedDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;

        if (normalizedDomain !== targetDomain && !normalizedDomain.endsWith('.' + targetDomain)) {
          return null; // Skip this cookie if domain doesn't match
        }

        // Convert expires timestamp to Date object or 'Infinity'
        let expires: Date | 'Infinity' = 'Infinity';
        if (typeof cdpCookie.expires === 'number' && cdpCookie.expires !== -1) {
          // CDP uses seconds since epoch, Date uses milliseconds
          expires = new Date(cdpCookie.expires * 1000);
        }

        // Determine hostOnly based on the leading dot
        const hostOnly = !cookieDomain.startsWith('.');
        // Use the domain without the leading dot for tough-cookie consistency
        const domainForToughCookie = hostOnly ? cookieDomain : cookieDomain.substring(1);

        // Normalize sameSite to lowercase
        const sameSite = cdpCookie.sameSite ? cdpCookie.sameSite.toLowerCase() : undefined;

        try {
          // Create a new tough-cookie Cookie object
          return new Cookie({
            key: cdpCookie.name, // Map 'name' to 'key'
            value: cdpCookie.value,
            domain: domainForToughCookie, // Use normalized domain
            path: cdpCookie.path || '/', // Default path to '/'
            expires: expires, // Use the converted Date object
            httpOnly: cdpCookie.httpOnly || false,
            secure: cdpCookie.secure || false,
            hostOnly: hostOnly, // Set calculated hostOnly
            sameSite: sameSite // Use normalized sameSite
          });
        } catch (cookieError) {
          return null;
        }
      }).filter((cookie): cookie is Cookie => cookie != null); // Filter out any nulls


    } catch (error) {
      return; // Stop execution if cookies cannot be loaded/parsed
    }
  } else {
    return; // Stop execution if cookie file is missing
  }

  if (toughCookies.length === 0) {
    console.error('No valid cookies were loaded. Cannot proceed.');
    return;
  }

  const scraper = new Scraper({
  });

  try {


    // load cookies from file called /Users/prem/Downloads/project/cookies/socagentic_cookies_converted.json
    const cookieFilePath = path.resolve(__dirname, '../../cookies/socagentic_cookies_converted.json');
    const cookieJsonString = fs.readFileSync(cookieFilePath, 'utf-8');
    const cookieData: any[] = JSON.parse(cookieJsonString); // Array of CDP cookie dicts
    const toughCookies = cookieData.map((cdpCookie: any) => {
      return new Cookie(cdpCookie);
    });
    // Set the loaded cookies into the scraper instance
    await scraper.setCookies(toughCookies);
    console.log('Cookies set in scraper instance.');

    // Verify login status (optional but recommended)
    const loggedIn = await scraper.isLoggedIn();
    if (!loggedIn) {
      console.error('Failed to authenticate using the provided cookies. Cookies might be expired or invalid.');
      return;

      // // Retrieve username and password from environment variables
      // const username = 'socagentic';
      // const password = 'J9qA$YT:WH:LR^Y';

      // if (!username || !password) {
      //   console.error('TWITTER_USERNAME and TWITTER_PASSWORD environment variables must be set for login.');
      //   return; // Stop if credentials are not available
      // }

      // await scraper.login(username, password); // Assuming the Scraper class has a login method
      // const me = await scraper.me(); // Get current user info after password login
      // console.log('scraper.me() after password login:', me);
      // const cookiesToSave = await scraper.getCookies(); // Retrieve cookies from the scraper
      // console.log('cookiesToSave:', cookiesToSave);
      // const cookiesJson = JSON.stringify(cookiesToSave, null, 2); // Convert cookies to JSON format
      // fs.writeFileSync(saveCookiesFilePath, cookiesJson); // Save cookies to file
    } else {
      const me = await scraper.me(); // Get current user info after cookie login
      console.log('scraper.me() after COOKIEEEESSSS login:', me);
      // // Save cookies to the new folder (in tough-cookie JSON format)
      // const cookiesToSave = await scraper.getCookies(); // Retrieve cookies from the scraper
      // const cookiesJson = JSON.stringify(cookiesToSave, null, 2); // Convert cookies to JSON format
      // fs.writeFileSync(saveCookiesFilePath, cookiesJson); // Save cookies to file
    }

  } catch (error) {
    console.error('Error during scraper operations:', error);
  }
}

main().catch(console.error); 