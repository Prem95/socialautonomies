"use client";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { AuthHeader } from "@/components/auth/auth-header";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Zap, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  
  useEffect(() => {
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-noise opacity-5"></div>
      
      {/* Floating gradient orbs */}
      <motion.div
        className="absolute top-32 left-16 w-72 h-72 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-3xl opacity-20"
        animate={{
          x: [0, 25, 0],
          y: [0, -25, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-32 right-16 w-64 h-64 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-3xl opacity-20"
        animate={{
          x: [0, -35, 0],
          y: [0, 35, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />

      <div className="container flex min-h-screen w-screen flex-col items-center justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px]"
        >
          {/* Welcome back section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center space-y-4 mb-2"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-gray-600 text-lg"
            >
              Welcome back to Social Autonomies
            </motion.p>
          </motion.div>

          {/* Auth card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <AuthHeader
                heading="Welcome Back"
                text="Enter your email to sign in with Magic Link"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              <MagicLinkForm isSignUp={false} />
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="pt-4 border-t border-gray-100"
            >
              <div className="space-y-3">
                <motion.div
                  className="flex items-center gap-3 text-sm text-gray-600"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Secure and passwordless</span>
                </motion.div>
                
                <motion.div
                  className="flex items-center gap-3 text-sm text-gray-600"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Quick access via email</span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Footer text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center text-sm text-gray-500"
          >
            Don't have an account yet?{" "}
            <motion.a
              href="/signup"
              className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              Sign up <ArrowRight className="h-3 w-3" />
            </motion.a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}