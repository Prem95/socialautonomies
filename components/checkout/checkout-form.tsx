"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStripe, isStripeConfigured } from "@/lib/stripe-client";

interface CheckoutFormProps {
  planId: string;
}

export function CheckoutForm({ planId }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Check if Stripe is properly configured
      if (!isStripeConfigured()) {
        throw new Error("Stripe is not properly configured. Please check your environment variables.");
      }

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("Failed to load Stripe.js. Please check your network connection and try again.");
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const { sessionId } = await response.json();

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? "Processing..." : "Subscribe Now"}
    </Button>
  );
}