import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/app/db/utils/dbClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  let userId: string | null = null;
  
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user ID from request headers (set by middleware)
    userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log(`Verifying checkout session ${sessionId} for user ${userId}`);
    
    // Check if this session has already been processed
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { stripeCustomerId: true, subscriptionStatus: true }
    });

    // Retrieve the session from Stripe with proper error handling
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      });
    } catch (stripeError) {
      console.error('Failed to retrieve Stripe session:', stripeError);
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 400 }
      );
    }
    
    if (session.customer_details?.email) {
      console.log(`Session belongs to email: ${session.customer_details.email}`);
    }
    
    // Validate session ownership
    if (session.metadata?.userId !== userId) {
      console.error(`Session user ID mismatch: expected ${userId}, got ${session.metadata?.userId}`);
      return NextResponse.json(
        { error: 'Session does not belong to authenticated user' },
        { status: 403 }
      );
    }
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }
    
    // Extract and validate required data
    const planId = session.metadata?.planId;
    const stripeCustomerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;
    
    if (!planId) {
      console.error('Missing planId in session metadata');
      return NextResponse.json(
        { error: 'Missing plan information in session' },
        { status: 400 }
      );
    }

    if (!stripeCustomerId) {
      console.error('Missing customer ID in session');
      return NextResponse.json(
        { error: 'Missing customer information' },
        { status: 400 }
      );
    }
    
    console.log(`Processing successful payment for user ${userId}, plan ${planId}, billing: monthly`);
    
    // Safely extract subscription data
    let billingData: any = {
      lastUsageReset: new Date(), // Reset usage when starting new subscription
    };
    
    if (session.subscription) {
      try {
        const subscription = session.subscription as Stripe.Subscription;
        
        if (subscription.id && subscription.status) {
          billingData = {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
            subscriptionStatus: subscription.status,
            currentPeriodStart: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000) 
              : null,
            currentPeriodEnd: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000) 
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            usageResetDay: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).getDate() 
              : 1,
            lastUsageReset: new Date(),
            trialStart: subscription.trial_start 
              ? new Date(subscription.trial_start * 1000) 
              : null,
            trialEnd: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000) 
              : null,
          };
        }
      } catch (subscriptionError) {
        console.warn('Warning: Failed to parse subscription data, proceeding with basic billing data:', subscriptionError);
        // Continue with basic billing data - don't fail the entire operation
      }
    }
    
    // Update user's profile with plan and billing information using transaction
    const updatedProfile = await prisma.$transaction(async (tx) => {
      // Reset usage counters when upgrading/changing plans
      const resetData = {
        tweetsUsed: 0,
        customGenerationsUsed: 0,
        repliesUsed: 0,
      };

      return await tx.profile.upsert({
        where: { userId },
        update: {
          planId: BigInt(planId),
          stripeCustomerId,
          ...billingData,
          ...resetData,
        },
        create: {
          userId,
          planId: BigInt(planId),
          stripeCustomerId,
          profileCreatedAt: new Date(),
          ...billingData,
          ...resetData,
        }
      });
    });
    
    console.log(`✅ Successfully updated profile for user ${userId} with plan ${planId}`);
    
    return NextResponse.json({ 
      success: true,
      profile: {
        planId: updatedProfile.planId.toString(),
        subscriptionStatus: updatedProfile.subscriptionStatus || 'active',
        stripeCustomerId: updatedProfile.stripeCustomerId,
      }
    });
    
  } catch (error) {
    console.error(`❌ Error verifying session for user ${userId}:`, error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Payment verification failed',
          details: error.message,
          userId: userId || 'unknown'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Payment verification failed', 
        details: 'Unknown error occurred',
        userId: userId || 'unknown'
      },
      { status: 500 }
    );
  }
} 