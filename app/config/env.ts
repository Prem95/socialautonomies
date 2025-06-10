/**
 * Environment Variables Config
 * 
 * Centralizes access to environment variables for better consistency and error handling
 */

// Set debug mode
export const IS_DEBUG = process.env.NODE_ENV !== 'production';

// Helper function to safely get environment variables
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (!value) {
    if (IS_DEBUG) {
      console.warn(`[ENV] Environment variable ${key} is not defined - using default value: ${defaultValue}`);
    }
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    if (IS_DEBUG) {
      console.error(`[ENV] Environment variable ${key} is required but not defined`);
    }
    return '';
  }
  
  return value;
}

// Twitter/X API config
export const TWITTER_API_KEY = getEnvVar('TWITTER_API_KEY', '');
export const TWITTER_API_SECRET = getEnvVar('TWITTER_API_SECRET', '');

// Stripe config (client-safe keys only)
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '');
export const STRIPE_WEBHOOK_SECRET = getEnvVar('STRIPE_WEBHOOK_SECRET', '');

// Server URLs
export const NEXT_PUBLIC_APP_URL = getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'); 
