"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeroImage } from "@/components/landing/hero-image";
import { motion, useInView } from "framer-motion";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Bot } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load non-critical components
const FeaturesSection = dynamic(() => import("@/components/landing/features-section").then(mod => ({ default: mod.FeaturesSection })), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
  ssr: false
});

const PricingTiers = dynamic(() => import("@/components/pricing/pricing-tiers").then(mod => ({ default: mod.PricingTiers })), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
  ssr: false
});

const LandingFooter = dynamic(() => import("@/components/landing/footer").then(mod => ({ default: mod.LandingFooter })), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse" />,
  ssr: false
});

function SectionHeading({ text, highlightedText }: { text: string; highlightedText: string }) {
  return (
    <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900 font-sans tracking-[-0.01em]">
      {text} <span className="text-primary">{highlightedText}</span>
    </h2>
  );
}

function ActionButtons() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 text-white">
        <Link href={user ? "/dashboard" : "/signup"}>
          <Bot className="mr-2 h-5 w-5" />
          Go to Dashboard
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="border-2">
        <Link href="/pricing">View Pricing</Link>
      </Button>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-cream relative overflow-hidden">
        {/* Grain overlay */}
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-5"></div>

        <main>
          {/* Hero Section */}
          <section className="container mx-auto rounded-2xl bg-white/80 p-8 shadow-soft backdrop-blur-lg mt-4 md:grid md:grid-cols-2 gap-12 relative overflow-hidden">
            {/* Left Column */}
            <div className="space-y-6 mt-12 md:mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900 font-martian tracking-[-0.02em]">
                  Scale your X Organically
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-4 text-xl text-gray-800 max-w-lg font-medium"
              >
                Post & Schedule Tweets, Monitor Engagements, and Grow Your Audience
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6"
              >
                <ActionButtons />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-wrap gap-4 mt-2"
              >
                <p className="text-gray-600 text-sm">
                  Get started today and take control of your social media presence
                </p>
              </motion.div>
            </div>

            {/* Right Column */}
            <motion.div
              className="hidden md:block rounded-2xl overflow-hidden shadow-soft mt-8 md:mt-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <HeroImage />
            </motion.div>
          </section>

          {/* FeaturesSection with entrance animation and container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
              <FeaturesSection />
            </div>
          </motion.div>

          {/* PricingTiers with entrance animation and container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-0"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-0 md:py-4">
              <SectionHeading
                text="One Price for"
                highlightedText=" All Levels"
              />
              <React.Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
                <PricingTiers />
              </React.Suspense>
            </div>
          </motion.div>
        </main>
      </div>
      <LandingFooter />
    </div>
  );
}