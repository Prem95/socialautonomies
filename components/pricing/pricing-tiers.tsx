"use client";

import { useEffect, useState } from "react";
import { PricingCard } from "./pricing-card";
import { useAuth } from "@/contexts/auth-context";

// Types
interface PlanFeature {
  name: string;
  category: string;
  included: boolean;
  description?: string;
}

interface PricingPlan {
  name: string;
  description: string;
  tooltip: string;
  planId: string;
  price: number; // Monthly price only
  features: PlanFeature[];
  popular?: boolean;
  comingSoon?: boolean;
  order: number;
}

// User's profile data interface
interface UserProfile {
  userId: string;
  planId: string | null;
  customGenerationsUsed: number;
  tweetsUsed: number;
  
  // Billing Information (Monthly only)
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionStatus: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  lastUsageReset: string | null;
  usageResetDay: number | null;
  
  plan: {
    planId: string;
    planName: string;
    price: string;
    maxAgents: number;
    maxTweetsPerAgent: number;
    maxCustomGenerations: number;
    maxRepliesPerAgent: number;
  } | null;
}

// Button type for pricing cards
type ButtonType = 'subscribe' | 'current' | 'upgrade' | 'downgrade' | 'coming-soon';

// Plan comparison helper
function comparePlans(currentPlan: string, targetPlan: string): 'upgrade' | 'downgrade' {
  const planHierarchy = ['Basic', 'Standard', 'Expert'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(targetPlan);
  return targetIndex > currentIndex ? 'upgrade' : 'downgrade';
}

// Determine button type based on user's current plan
export const getButtonType = (
  targetPlan: PricingPlan,
  userProfile: UserProfile | null,
  isAuthenticated: boolean
): ButtonType => {
  // Coming soon plans
  if (targetPlan.comingSoon) {
    return 'coming-soon';
  }

  // Not authenticated users
  if (!isAuthenticated || !userProfile?.plan) {
    return 'subscribe';
  }

  const currentPlan = userProfile.plan;

  // Same plan
  if (currentPlan.planId === targetPlan.planId) {
    return 'current';
  }

  // Different plans - determine upgrade/downgrade
  const comparison = comparePlans(currentPlan.planName, targetPlan.name);
  return comparison;
};

// Monthly-only plans data
const monthlyPlans: PricingPlan[] = [
  {
    name: "Basic",
    description: "Perfect for small accounts under 300 followers",
    tooltip: "Ideal for those under 300 followers",
    planId: "1",
    order: 1,
    price: 9, // $9/month
    features: [
      { name: "1 AI Agent & X Account", category: "Includes", included: true },
      { name: "15 Smart Tweets", category: "AI Features", included: true },
      { name: "15 Smart Generations", category: "AI Features", included: true },
      { name: "50 Smart Replies", category: "AI Features", included: true },
      { name: "Smart Replies & Engagement", category: "Includes", included: true }
    ],
    popular: false,
    comingSoon: false
  },
  {
    name: "Standard",
    description: "Perfect for growing accounts under 1000 followers",
    tooltip: "Designed for growing accounts under 1000 followers",
    planId: "2",
    order: 2,
    price: 19, // $19/month
    features: [
      { name: "1 AI Agent & X Account", category: "Includes", included: true },
      { name: "30 Smart Tweets", category: "AI Features", included: true },
      { name: "30 Smart Generations", category: "AI Features", included: true },
      { name: "100 Smart Replies", category: "AI Features", included: true },
      { name: "Smart Replies & Engagement", category: "Includes", included: true },
    ],
    popular: true,
    comingSoon: false
  },
  {
    name: "Expert",
    description: "Perfect for large accounts over 10000 followers",
    tooltip: "Built for large accounts over 10000 followers",
    planId: "3",
    order: 3,
    price: 29, // $29/month
    features: [
      { name: "1 AI Agent & X Account", category: "Includes", included: true },
      { name: "60 Smart Tweets", category: "AI Features", included: true },
      { name: "100 Smart Generations", category: "AI Features", included: true },
      { name: "500 Smart Replies", category: "AI Features", included: true },
      { name: "Smart Replies & Engagement", category: "Includes", included: true },
      { name: "Premium Content + Images", category: "AI Features", included: true, description: "Custom Image Generation and Image Tweets" }
    ],
    popular: false,
    comingSoon: true
  }
];

export function PricingTiers() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();

  const fetchUserProfile = async () => {
    // Only fetch if user is authenticated
    if (!user) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/profile');
      
      if (response.ok) {
        const profileData = await response.json();
        console.log('User profile data:', profileData);
        setUserProfile(profileData);
      } else if (response.status === 404) {
        // User doesn't have a profile yet - they're authenticated but no subscription
        console.log('User authenticated but no profile found');
        setUserProfile(null);
      } else {
        // API error
        console.log('Error fetching profile:', response.status);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching profile
    if (!authLoading) {
      console.log('PricingTiers: Auth loaded, fetching profile. User:', user?.id);
      fetchUserProfile();
    }
  }, [user, authLoading]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3 max-w-7xl mx-auto">
        {monthlyPlans.map((plan) => (
          <PricingCard 
            key={plan.name} 
            plan={plan} 
            userProfile={userProfile}
            isAuthenticated={!!user}
            buttonType={getButtonType(plan, userProfile, !!user)}
            onSubscriptionChange={fetchUserProfile}
          />
        ))}
      </div>
    </div>
  );
}