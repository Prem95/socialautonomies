# Database Seeding - Pricing Plans (Monthly Only)

This document explains how to seed your database with monthly-only pricing plans.

## 📋 Plans Overview

The seed script creates 3 pricing plans with monthly billing only:

### Basic Plan
- **Monthly**: $9/month (15 tweets, 15 generations)
- **Features**: 1 AI Agent, Schedule Tweets, Auto-Run, Organic Engagement

### Standard Plan  
- **Monthly**: $19/month (30 tweets, 40 generations)
- **Features**: 1 AI Agent, Smart Content Generation, Smart Engagement

### Expert Plan
- **Monthly**: $29/month (60 tweets, 100 generations)
- **Features**: 1 AI Agent, Enhanced Content Generation, Advanced Features

## 🚀 How to Run the Seed

### 1. Before Running (Important!)

You need to update the Stripe Price IDs in `prisma/seed.ts`. Replace these placeholders:

```typescript
// Replace these with your actual Stripe Price IDs:
'BASIC_MONTHLY_PRICE_ID'     → 'price_xxxxx'    // Monthly recurring
'STANDARD_MONTHLY_PRICE_ID'  → 'price_xxxxx'    // Monthly recurring
'EXPERT_MONTHLY_PRICE_ID'    → 'price_xxxxx'    // Monthly recurring
```

### 2. Run the Seed Command

```bash
# Generate Prisma client first (if not already done)
npx prisma generate

# Run the seed script
npx prisma db seed
```

### 3. Verify the Data

```bash
# Open Prisma Studio to verify the data
npx prisma studio
```

## 📊 Database Structure

The seed creates 3 plans with these IDs:

| Plan ID | Plan Name | Monthly Price | Features |
|---------|-----------|---------------|----------|
| 1 | Basic | $9.00 | 1 Agent, 15 Tweets, 15 Generations |
| 2 | Standard | $19.00 | 1 Agent, 30 Tweets, 40 Generations |
| 3 | Expert | $29.00 | 1 Agent, 60 Tweets, 100 Generations |

## 🏗 Schema Structure

Each plan record contains:

```typescript
{
  planId: BigInt,
  planName: string,
  price: number,                    // Monthly price
  currency: 'usd',
  interval: 'month',               // Monthly interval only
  stripePriceId: string,           // Monthly Stripe price ID
  maxAgents: number,
  maxTweetsPerAgent: number,
  maxCustomGenerations: number
}
```

## 🔄 Re-running the Seed

The seed script uses `upsert` operations, so it's safe to run multiple times. It will:
- Create plans if they don't exist
- Skip creation if they already exist (based on planId)

## 🛠 Customization

To modify the plans, edit `prisma/seed.ts`:

```typescript
// Example: Change Basic plan pricing
const basicPlan = await prisma.plan.upsert({
  where: { planId: 1n },
  update: {},
  create: {
    planId: 1n,
    planName: 'Basic',
    price: 12.00, // Changed from 9.00
    stripePriceId: 'price_monthly_xxx',
    // ... rest of the fields
  },
});
```

## ⚠ Important Notes

1. **BigInt IDs**: Plan IDs use BigInt (note the `n` suffix: `1n`, `2n`, etc.)
2. **Single Plan Records**: Each plan type has ONE record with monthly pricing only
3. **Stripe Integration**: Each plan needs ONE Stripe price ID (monthly)
4. **Currency**: All prices are in USD (`'usd'`)
5. **Interval**: Set to 'month' for monthly billing

## 🔗 Related Files

- `prisma/schema.prisma` - Database schema
- `components/pricing/pricing-tiers.tsx` - Frontend pricing logic
- `app/api/stripe/` - Stripe integration endpoints

## 📝 Stripe Setup Guide

You'll need to create these products in your Stripe Dashboard:

### Basic Plan
- **Monthly**: $9.00/month recurring → `stripePriceId`

### Standard Plan  
- **Monthly**: $19.00/month recurring → `stripePriceId`

### Expert Plan
- **Monthly**: $29.00/month recurring → `stripePriceId`

## 🔄 Frontend Integration

The frontend pricing components expect:
- Plan IDs: 1, 2, 3
- Monthly prices from the `price` field
- Stripe integration uses monthly price ID only 