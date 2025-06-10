import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/app/db/utils/dbClient';

// Disable Next.js body parsing to get the raw body for webhook verification
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to handle BigInt serialization
function serializeData(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    )
  );
}

// Helper function to get plan ID from Stripe price ID (Monthly only)
async function getPlanIdFromPriceId(priceId: string): Promise<bigint | null> {
  try {
    console.log(`Searching for plan with Stripe price ID: ${priceId}`);
    
    // Query the database to find a plan that matches the monthly price ID
    const plan = await prisma.plan.findFirst({
      where: {
        stripePriceId: priceId
      },
      select: {
        planId: true
      }
    });

    if (plan) {
      console.log(`Found matching plan ID: ${plan.planId} for price ID: ${priceId}`);
      return plan.planId;
    } else {
      console.warn(`No plan found in the database for Stripe price ID: ${priceId}`);
      return null;
    }
    
  } catch (error) {
    console.error(`Error mapping price ID ${priceId} to plan ID:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    console.log('🔔 Received webhook:', {
      bodyLength: body.length,
      hasSignature: !!signature
    });

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    // Check if we're in development and using ngrok
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('⚠️ Development mode detected');
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.log('⚠️ Normal verification failed, parsing event directly for development');
        try {
          event = JSON.parse(body) as Stripe.Event;
          console.log('✅ Successfully parsed event directly for development');
        } catch (parseErr) {
          console.error('Failed to parse event JSON:', parseErr);
          return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }
      }
    } else {
      // Production mode - always verify signature
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    console.log(`🔔 Processing webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        console.log(`✅ Successfully processed ${event.type}`);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        console.log(`✅ Successfully processed ${event.type}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout.session.completed:', session.id);

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId || !subscriptionId) {
      throw new Error('Missing customer or subscription ID in session');
    }

    // Retrieve the full subscription object to get all details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const status = subscription.status;
    const currentPeriodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000) 
      : new Date();
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000) 
      : new Date();
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      throw new Error('No price ID found in subscription from checkout session');
    }
    
    // Get plan details (monthly only)
    const planId = await getPlanIdFromPriceId(priceId);
    
    if (!planId) {
      throw new Error(`Could not map price ID ${priceId} to plan ID`);
    }

    // Verify profile exists
    const existingProfile = await prisma.profile.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!existingProfile) {
      throw new Error(`No profile found for Stripe customer ${customerId}`);
    }

    // Update the user's profile with the new subscription details
    const updatedProfile = await prisma.profile.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        planId: planId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionStatus: status,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd,
        lastUsageReset: new Date(),
        usageResetDay: new Date().getDate(),
      },
    });

    if (updatedProfile.count === 0) {
      throw new Error(`Failed to update profile for customer ${customerId} during checkout completion`);
    } else {
      console.log(`✅ Successfully created subscription and updated profile for customer ${customerId}`);
    }

  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing subscription.updated:', subscription.id);

    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    
    // Safe date conversion with validation
    const currentPeriodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000) 
      : new Date();
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000) 
      : new Date();
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    // Validate dates
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('Invalid dates after conversion:', {
        currentPeriodStart: currentPeriodStart.toString(),
        currentPeriodEnd: currentPeriodEnd.toString(),
        originalStart: subscription.current_period_start,
        originalEnd: subscription.current_period_end
      });
      throw new Error('Invalid date conversion from Stripe timestamps');
    }

    // Get the price ID from the first subscription item
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      throw new Error('No price ID found in subscription');
    }

    // Get plan ID (monthly only)
    const planId = await getPlanIdFromPriceId(priceId);

    if (!planId) {
      throw new Error(`Could not map price ID ${priceId} to plan ID`);
    }

    // First, verify the profile exists and get user info for logging
    const existingProfile = await prisma.profile.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true, planId: true }
    });

    if (!existingProfile) {
      throw new Error(`No profile found for Stripe customer ${customerId}`);
    }

    console.log(`Updating subscription for user ${existingProfile.userId}: ${existingProfile.planId} → ${planId}`);

    // Update the user's profile with the new subscription details
    const updatedProfile = await prisma.profile.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        planId: planId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionStatus: status,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd,
        lastUsageReset: new Date(),
        usageResetDay: new Date().getDate(),
      },
    });

    if (updatedProfile.count === 0) {
      throw new Error(`Failed to update profile for customer ${customerId}`);
    } else {
      console.log(`✅ Successfully updated subscription for customer ${customerId}`);
    }

  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
    throw error;
  }
} 