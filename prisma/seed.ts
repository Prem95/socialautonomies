import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed the database...');

  // Create Basic Plan (monthly only)
  const basicPlan = await prisma.plan.upsert({
    where: { planId: 1n },
    update: {
      maxRepliesPerAgent: 50, // Monthly limit
    },
    create: {
      planId: 1n,
      planName: 'Basic',
      price: 9.00, // Monthly price
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'price_1RW8CUGfaTlhTw0SKNc1lXks', // Monthly Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 15, // Monthly limit
      maxCustomGenerations: 15, // Monthly limit
      maxRepliesPerAgent: 50, // Monthly limit
    },
  });

  // Create Standard Plan (monthly only)
  const standardPlan = await prisma.plan.upsert({
    where: { planId: 2n },
    update: {
      maxRepliesPerAgent: 100, // Monthly limit
    },
    create: {
      planId: 2n,
      planName: 'Standard',
      price: 19.00, // Monthly price
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'price_1RW8CmGfaTlhTw0S7IqcENnf', // Monthly Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 30, // Monthly limit
      maxCustomGenerations: 40, // Monthly limit
      maxRepliesPerAgent: 100, // Monthly limit
    },
  });

  // Create Expert Plan (monthly only)
  const expertPlan = await prisma.plan.upsert({
    where: { planId: 3n },
    update: {
      maxRepliesPerAgent: 200, // Monthly limit
    },
    create: {
      planId: 3n,
      planName: 'Expert',
      price: 29.00, // Monthly price
      currency: 'usd',
      interval: 'month',
      stripePriceId: 'price_1RW8D2GfaTlhTw0SPr7kFojz', // Monthly Stripe price ID
      maxAgents: 1,
      maxTweetsPerAgent: 60, // Monthly limit
      maxCustomGenerations: 100, // Monthly limit
      maxRepliesPerAgent: 200, // Monthly limit
    },
  });

  console.log('✅ Created plans:');
  console.log('📦 Basic Plan:', basicPlan);
  console.log('📦 Standard Plan:', standardPlan);
  console.log('📦 Expert Plan:', expertPlan);

  console.log('🎉 Database seeding completed successfully!');
  console.log('💰 Pricing Structure (Monthly Only):');
  console.log('   Basic: $9/month - 15 tweets, 15 generations, 50 replies');
  console.log('   Standard: $19/month - 30 tweets, 40 generations, 100 replies');
  console.log('   Expert: $29/month - 60 tweets, 100 generations, 200 replies');
  console.log('');
  console.log('📝 Each plan contains monthly Stripe price ID only:');
  console.log('   - stripePriceId: Monthly recurring price');
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