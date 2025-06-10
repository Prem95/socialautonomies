/**
 * Server Configuration
 * Contains Express server URL configuration for API forwarding
 */

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  // Silent fail - Next.js might already have loaded the variables
}

/**
 * Get the Express server URL from environment or fallback to localhost
 */
const getExpressServerUrl = (): string => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
};

export const EXPRESS_SERVER_URL = getExpressServerUrl();

// Log configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log(`[Server Config] Using Express server URL: ${EXPRESS_SERVER_URL}`);
}

export default {
  EXPRESS_SERVER_URL,
}; 