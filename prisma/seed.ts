import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed the database...');

  // Create Basic Plan (monthly)
  const basicPlan = await prisma.plan.upsert({
    where: { planId: 1n },
    update: {},
    create: {
      planId: 1n,
      planName: 'Basic',
      price: 0.00, // Set your pricing
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'your_stripe_price_id_basic', // Replace with your Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 15, // Configure your limits
      maxCustomGenerations: 15,
      maxRepliesPerAgent: 50,
    },
  });

  // Create Standard Plan (monthly)
  const standardPlan = await prisma.plan.upsert({
    where: { planId: 2n },
    update: {},
    create: {
      planId: 2n,
      planName: 'Standard',
      price: 0.00, // Set your pricing
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'your_stripe_price_id_standard', // Replace with your Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 30, // Configure your limits
      maxCustomGenerations: 40,
      maxRepliesPerAgent: 100,
    },
  });

  // Create Expert Plan (monthly)
  const expertPlan = await prisma.plan.upsert({
    where: { planId: 3n },
    update: {},
    create: {
      planId: 3n,
      planName: 'Expert',
      price: 0.00, // Set your pricing
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'your_stripe_price_id_expert', // Replace with your Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 60, // Configure your limits
      maxCustomGenerations: 100,
      maxRepliesPerAgent: 200,
    },
  });

  console.log('✅ Created plans:');
  console.log('📦 Basic Plan:', basicPlan);
  console.log('📦 Standard Plan:', standardPlan);
  console.log('📦 Expert Plan:', expertPlan);

  console.log('🎉 Database seeding completed successfully!');
  console.log('💡 Remember to update pricing and Stripe price IDs in the seed file');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 