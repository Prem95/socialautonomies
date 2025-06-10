import { loadStripe, Stripe } from '@stripe/stripe-js';

// Environment validation
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Stripe instance (singleton pattern)
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe instance with proper error handling
 * @returns Promise<Stripe | null>
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    if (!publishableKey) {
      console.error('Stripe publishable key is not configured');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey)
      .then((stripe) => {
        if (!stripe) {
          console.error('Failed to load Stripe.js - please check your network connection');
          return null;
        }
        return stripe;
      })
      .catch((error) => {
        console.error('Error loading Stripe.js:', error);
        // Reset the promise so we can try again
        stripePromise = null;
        return null;
      });
  }

  return stripePromise;
};

/**
 * Check if Stripe is properly configured
 * @returns boolean
 */
export const isStripeConfigured = (): boolean => {
  return !!publishableKey;
};

/**
 * Get the publishable key (for debugging)
 * @returns string | undefined
 */
export const getPublishableKey = (): string | undefined => {
  return publishableKey;
}; 