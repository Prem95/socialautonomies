import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/app/db/utils/dbClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, successUrl, cancelUrl } = body;

    // Get authenticated user ID from request headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.error('No user ID provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('Creating checkout session for user:', userId, 'planId:', planId);

    // Get plan details from database
    const plan = await prisma.plan.findUnique({
      where: { planId: BigInt(planId) }
    });
    
    if (!plan) {
      console.error(`Plan not found with ID: ${planId}`);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
    
    console.log('Found plan:', {
      planId: plan.planId.toString(),
      name: plan.planName,
      price: plan.price,
      stripePriceId: plan.stripePriceId
    });

    // Check if user already has a profile
    let profile = await prisma.profile.findUnique({
      where: { userId }
    });

    // Create profile if it doesn't exist
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          profileCreatedAt: new Date()
        }
      });
    }

    // Use monthly price ID only
    const priceId = plan.stripePriceId;
    
    console.log('Using monthly price ID:', priceId);
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Monthly pricing not available for this plan' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = profile.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: request.headers.get('x-user-email') || 'user@example.com',
        metadata: {
          userId: userId
        }
      });
      
      // Update profile with Stripe customer ID
      await prisma.profile.update({
        where: { userId },
        data: { stripeCustomerId: customer.id }
      });
      
      stripeCustomerId = customer.id;
    }

    // Create a Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${new URL('/checkout/success', successUrl).toString()}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId: planId.toString(),
        billing_period: 'monthly'
      },
      allow_promotion_codes: true,
    });
    
    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Handle specific Stripe errors based on documentation
    if (error && typeof error === 'object' && 'type' in error) {
      switch (error.type) {
        case 'StripeCardError':
          return NextResponse.json(
            { error: `Card error: ${error.message}` },
            { status: 400 }
          );
        case 'StripeRateLimitError':
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        case 'StripeInvalidRequestError':
          return NextResponse.json(
            { error: `Invalid request: ${error.message}` },
            { status: 400 }
          );
        case 'StripeAPIError':
          return NextResponse.json(
            { error: 'Stripe API error. Please try again.' },
            { status: 500 }
          );
        case 'StripeAuthenticationError':
          return NextResponse.json(
            { error: 'Authentication error with Stripe' },
            { status: 401 }
          );
        default:
          return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}