"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function HeroImage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [0, -10, 0, 10, 0]
      }}
      transition={{ 
        duration: 0.5,
        y: {
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden"
    >
      {/* Glass container */}
      <div className="absolute inset-0 bg-white/15 backdrop-blur-[20px] rounded-2xl border border-white/20 shadow-soft">
        {/* Border gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50" />
        
        {/* Image - Optimized */}
        <div className="relative h-full w-full overflow-hidden rounded-2xl p-2">
          <Image
            src="/hero.png" /* Converted to WebP format */
            alt="Social Autonomies Hero Image"
            width={800} /* Reduced size */
            height={600}
            priority
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PC9zdmc+" 
            sizes="(max-width: 768px) 100vw, 800px"
            className="h-full w-full object-contain rounded-2xl"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Simplified decorative elements with contain:layout */}
      <div className="absolute -left-4 top-1/2 h-32 w-32 -translate-y-1/2 bg-gradient-accent from-accent-start to-accent-end blur-2xl opacity-60 contain-layout" />
      <div className="absolute -right-4 top-1/2 h-32 w-32 -translate-y-1/2 bg-[#F2E8DA] blur-2xl opacity-60 contain-layout" />

      {/* Simplified floating elements with will-change optimization */}
      <motion.div
        className="absolute top-4 right-8 bg-white/90 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-soft will-change-transform"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-700">24/7 AI Agents</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-4 left-8 bg-white/90 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-soft"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Auto Tweet & Reply</span>
        </div>
      </motion.div>

      {/* Added: Smart Content */}
      <motion.div
        className="absolute top-1/4 left-[1rem] bg-white/90 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-soft"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-medium text-gray-700">Smart Content</span>
        </div>
      </motion.div>

      {/* Added: Advanced Analytics */}
      <motion.div
        className="absolute bottom-16 right-[1rem] bg-white/90 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-soft"
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm font-medium text-gray-700">Advanced Analytics</span>
        </div>
      </motion.div>
    </motion.div>
  );
}