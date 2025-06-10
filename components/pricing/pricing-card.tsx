"use client";

import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

// Feature interface
interface Feature {
  name: string;
  category: string;
  included: boolean;
  description?: string;
}

// User's profile data interface (simplified for monthly only)
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

type ButtonType = 'subscribe' | 'current' | 'upgrade' | 'downgrade' | 'coming-soon';

interface PricingCardProps {
  plan: {
    name: string;
    description: string;
    tooltip: string;
    price: number; // Monthly price only
    features: Feature[];
    popular?: boolean;
    planId: string;
    comingSoon?: boolean;
    order: number;
  };
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  buttonType: ButtonType;
  onSubscriptionChange?: () => void;
}

export function PricingCard({
  plan,
  userProfile,
  isAuthenticated,
  buttonType,
  onSubscriptionChange,
}: PricingCardProps) {
  // Determine if this is a special plan (popular, coming soon, etc.)
  const isPopular = plan.popular && buttonType !== 'coming-soon';
  const isComingSoon = buttonType === 'coming-soon';
  const isCurrent = buttonType === 'current';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative motion-reduce:transform-none motion-reduce:transition-none"
    >
      <Card className={cn(
        "relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 h-full flex flex-col",
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none",
        isPopular && "border-4 border-green-700 shadow-lg",
        isCurrent && "border-2 border-green-500",
        isComingSoon && "opacity-75"
      )}>
        {/* Popular Badge */}
        {isPopular && (
          <div className="absolute top-4 right-4">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
              Most Popular
            </div>
          </div>
        )}

        {/* Coming Soon Badge */}
        {isComingSoon && (
          <div className="absolute top-4 right-4">
            <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              Coming Soon
            </div>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrent && (
          <div className="absolute top-4 right-4">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              Current Plan
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
          <p className="text-gray-600 text-sm">{plan.description}</p>
        </div>

        {/* Price Display */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center mb-2">
            <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
            <span className="text-lg text-gray-600 ml-1">/month</span>
          </div>
          <p className="text-sm text-gray-500">
            Billed monthly
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-6">
          <CheckoutButton
            planId={plan.planId}
            buttonType={buttonType}
            currentPlanName={userProfile?.plan?.planName}
            targetPlanName={plan.name}
            className="w-full"
            onSubscriptionChange={onSubscriptionChange}
          />
        </div>

        {/* Features List */}
        <div className="flex-1">
          <div className="space-y-3">
            {plan.features.map((feature) => (
              <div key={feature.name} className="flex items-start">
                <Check className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0 text-green-500" />
                <div className="flex-1">
                  <span className="text-sm text-gray-700">
                    {feature.name}
                  </span>
                  {feature.description && (
                    <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}