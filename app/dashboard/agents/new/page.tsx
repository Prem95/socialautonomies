"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { AgentCreationCard } from "@/components/dashboard/agents/creation-card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Bot, Loader2, Sparkles, Zap, Brain } from "lucide-react";

export default function CreateAgentPage() {
  return (
    <DashboardShell>
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
        className="grid gap-8"
      >        
        <Suspense fallback={<EnhancedAgentCreationSkeleton />}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <AgentCreationCard />
          </motion.div>
        </Suspense>
      </motion.div>
    </DashboardShell>
  );
}

function EnhancedAgentCreationSkeleton() {
  const iconVariants = {
    animate: {
      rotate: [0, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: i * 0.1,
        ease: "easeOut"
      }
    })
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Enhanced Header Loading */}
      <motion.div 
        className="flex items-center justify-center py-12"
        variants={pulseVariants}
        animate="animate"
      >
        <div className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-amber-50 border border-blue-100 shadow-lg">
          <motion.div variants={iconVariants} animate="animate">
            <Bot className="h-8 w-8 text-blue-600" />
          </motion.div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Preparing agent workspace...
            </span>
          </div>
          <Sparkles className="h-6 w-6 text-amber-500" />
        </div>
      </motion.div>

      {/* Enhanced Form Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={i === 2 ? "md:col-span-2" : ""}
          >
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
              <div className="p-8 space-y-6">
                {/* Card Header with Icon */}
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-500 flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {i === 0 && <Bot className="h-6 w-6 text-white" />}
                    {i === 1 && <Brain className="h-6 w-6 text-white" />}
                    {i === 2 && <Zap className="h-6 w-6 text-white" />}
                    {i >= 3 && <Sparkles className="h-6 w-6 text-white" />}
                  </motion.div>
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-48 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-4 w-32 bg-gradient-to-r from-gray-100 to-gray-200" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-28 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-12 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg" />
                  </div>
                  
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-36 bg-gradient-to-r from-gray-200 to-gray-300" />
                    <Skeleton className="h-28 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg" />
                  </div>

                  {/* Special layout for main card */}
                  {i === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="space-y-3">
                          <Skeleton className="h-5 w-24 bg-gradient-to-r from-gray-200 to-gray-300" />
                          <Skeleton className="h-12 w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Additional fields for variety */}
                  {i > 3 && (
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-20 bg-gradient-to-r from-gray-200 to-gray-300" />
                      <div className="flex gap-3">
                        <Skeleton className="h-12 flex-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg" />
                        <Skeleton className="h-12 w-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Enhanced Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex justify-between items-center pt-8"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Skeleton className="h-12 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Skeleton className="h-12 w-40 bg-gradient-to-r from-blue-200 via-purple-200 to-amber-200 rounded-lg" />
        </motion.div>
      </motion.div>

      {/* Floating Elements for Extra Polish */}
      <motion.div
        className="absolute top-20 right-20 w-2 h-2 bg-blue-400 rounded-full opacity-60"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-40 left-20 w-1 h-1 bg-purple-400 rounded-full opacity-50"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </motion.div>
  );
} 