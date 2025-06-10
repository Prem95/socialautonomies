import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import fetch, { Headers } from 'node-fetch';

// --- Environment Variable Loading (unchanged) ---
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment variables from ${envPath}`);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.warn('Warning: Could not find .env file, environment variables may not be loaded');
}
// --- end env loading ---

// Pull your four credentials out of process.env
const {
  API_KEY,
  API_SECRET_KEY,
  ACCESS_TOKEN,
  ACCESS_TOKEN_SECRET
} = process.env as Record<string, string>;

if (!API_KEY || !API_SECRET_KEY || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
  throw new Error('Missing one of API_KEY, API_SECRET_KEY, ACCESS_TOKEN or ACCESS_TOKEN_SECRET in environment');
}

// Set up oauth-1.0a
const oauth = new OAuth({
  consumer: { key: API_KEY, secret: API_SECRET_KEY },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

// Utility to perform a signed GET
async function signedGet(url: string): Promise<any> {
  const requestData = { url, method: 'GET' };
  const token = { key: ACCESS_TOKEN, secret: ACCESS_TOKEN_SECRET };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const headers = new Headers({
    ...authHeader,
    'Content-Type': 'application/json'
  });

  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} – ${body}`);
  }
  return res.json();
}

async function runAuthTest() {
  console.log('Starting authentication test via OAuth1.0a…');

  try {
    console.log('Calling account/verify_credentials.json...');
    const profile = await signedGet('https://api.x.com/1.1/account/verify_credentials.json');

    console.log('✅ Authentication Successful!');
    console.log(`Logged in as @${profile.screen_name} (Name: ${profile.name})`);
  } catch (err) {
    console.error('❌ Authentication failed:', err);
  }
}

runAuthTest();
