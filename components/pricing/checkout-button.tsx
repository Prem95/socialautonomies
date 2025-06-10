"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStripe } from "@/lib/stripe-client";

type ButtonType = 'subscribe' | 'current' | 'upgrade' | 'downgrade' | 'coming-soon';

interface CheckoutButtonProps {
  planId: string;
  className?: string;
  buttonType: ButtonType;
  currentPlanName?: string;
  targetPlanName?: string;
  onSubscriptionChange?: () => void;
}

export function CheckoutButton({ 
  planId, 
  className,
  buttonType,
  currentPlanName,
  targetPlanName,
  onSubscriptionChange
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubscription = async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/stripe/manage-subscription', {
        method: 'POST',
      });

      const { url, error } = await res.json();
      
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      if (url) {
        router.push(url);
      } else {
        toast({
          title: "Error",
          description: "Could not manage subscription. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Subscription management error:', error);
      toast({
        title: "Error",
        description: "Could not manage subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId,
          successUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const { sessionId, error } = await res.json();
      
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      const stripe = await getStripe();
      if (stripe && sessionId) {
        // Trigger subscription update event for polling
        if (onSubscriptionChange) {
          localStorage.setItem('subscription-updating', 'true');
        }
        
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = (): string => {
    switch (buttonType) {
      case 'current':
        return 'Manage Plan';
      case 'upgrade':
        return `Upgrade to ${targetPlanName}`;
      case 'downgrade':
        return `Downgrade to ${targetPlanName}`;
      case 'coming-soon':
        return 'Coming Soon';
      case 'subscribe':
      default:
        return 'Subscribe';
    }
  };

  const getButtonVariant = () => {
    switch (buttonType) {
      case 'current':
        return 'outline';
      case 'coming-soon':
        return 'secondary';
      case 'upgrade':
      case 'subscribe':
      default:
        return 'default';
    }
  };

  const handleClick = () => {
    if (buttonType === 'coming-soon') {
      return; // Do nothing for coming soon plans
    }
    
    if (buttonType === 'current') {
      handleSubscription();
    } else {
      handleCheckout();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || buttonType === 'coming-soon'}
      variant={getButtonVariant()}
      className={className}
    >
      {isLoading ? 'Loading...' : getButtonText()}
    </Button>
  );
} 