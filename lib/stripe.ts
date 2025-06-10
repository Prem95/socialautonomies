import Stripe from "stripe";

// Use environment variables for Stripe keys
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Validate that keys are present
if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is required');
}

// Log which environment we're using (without exposing keys)
if (process.env.NODE_ENV !== 'production') {
  const isLiveKey = STRIPE_SECRET_KEY.startsWith('sk_live_');
  const isLivePublicKey = STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_');
  
  console.log(`🔐 Stripe Environment: ${isLiveKey && isLivePublicKey ? '🔴 LIVE (Production)' : '🟢 TEST (Sandbox)'}`);
  console.log(`🔑 Secret Key: ${STRIPE_SECRET_KEY.substring(0, 12)}...`);
  console.log(`🔑 Public Key: ${STRIPE_PUBLISHABLE_KEY.substring(0, 12)}...`);
  
  if (isLiveKey && isLivePublicKey) {
    console.warn('⚠️  WARNING: Using LIVE Stripe keys in development!');
  }
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const getStripePublicKey = () => {
  return STRIPE_PUBLISHABLE_KEY;
};