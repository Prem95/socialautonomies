import Stripe from 'stripe';
import { stripe } from '../stripe';
import prisma from '@/app/db/utils/dbClient';

export const createOrRetrieveCustomer = async ({
  email,
  uuid,
}: {
  email: string;
  uuid: string;
}) => {
  // Check if the user's profile exists
  let profile = await prisma.profile.findUnique({
    where: { userId: uuid },
  });

  // Create a profile if it doesn't exist
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: uuid,
        profileCreatedAt: new Date(),
      },
    });
  }

  // Use existing Stripe customer ID if available, or create a new one
  if (profile.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  // Create a new customer in Stripe
  const customer = await stripe.customers.create({
    email: email,
    metadata: {
      userId: uuid,
    },
  });

  // Update the profile with the new Stripe customer ID
  await prisma.profile.update({
    where: { userId: uuid },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}; 