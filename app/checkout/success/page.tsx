"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Sparkles, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Confetti animation component
const ConfettiPiece = ({ delay }: { delay: number }) => (
  <div
    className="absolute w-2 h-2 opacity-80 animate-pulse"
    style={{
      left: `${Math.random() * 100}%`,
      animationDelay: `${delay}ms`,
      animationDuration: `${2000 + Math.random() * 1000}ms`,
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
    }}
  >
    <div className="w-full h-full rounded-full animate-bounce" />
  </div>
);

// Floating particles for success state
const FloatingParticle = ({ icon: Icon, delay }: { icon: any; delay: number }) => (
  <div
    className="absolute text-2xl opacity-60 animate-bounce"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${delay}ms`,
      animationDuration: `${3000 + Math.random() * 2000}ms`
    }}
  >
    <Icon className="w-6 h-6 text-yellow-400" />
  </div>
);

// Component that uses useSearchParams - needs to be wrapped in Suspense
function CheckoutSuccessContent() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('No session ID provided');
      setIsProcessing(false);
      return;
    }
    
    const verifySession = async () => {
      try {
        console.log('Verifying session:', sessionId);
        
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setIsSuccess(true);
          setPlanName(data.plan?.name || 'Selected Plan');
          setShowConfetti(true);
          
          toast({
            title: "Subscription Successful!",
            description: `You have successfully subscribed to ${data.plan?.name || 'your plan'}`,
            variant: "default",
            duration: 5000,
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard?success=true');
          }, 3000);
        } else {
          const errorMessage = data.error || 'Failed to process subscription';
          setError(errorMessage);
          console.error('Session verification failed:', errorMessage);
          
          toast({
            title: "Subscription Processing Failed",
            description: errorMessage,
            variant: "destructive",
            duration: 8000,
          });
        }
      } catch (err) {
        const errorMessage = 'An unexpected error occurred while processing your subscription';
        setError(errorMessage);
        console.error('Error verifying session:', err);
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 8000,
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    verifySession();
  }, [searchParams, router, toast]);
  
  const handleRetryOrGoBack = () => {
    if (isSuccess) {
      router.push('/dashboard');
    } else {
      router.push('/pricing');
    }
  };
  
  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <ConfettiPiece key={i} delay={i * 100} />
  ));
  
  // Generate floating particles
  const floatingParticles = Array.from({ length: 8 }, (_, i) => (
    <FloatingParticle 
      key={i} 
      icon={[Sparkles, Heart, Star][i % 3]} 
      delay={i * 500} 
    />
  ));
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-green-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Confetti effect for success */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {confettiPieces}
        </div>
      )}
      
      {/* Main card with enhanced styling */}
      <Card className="w-full max-w-lg relative z-20 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        {/* Floating particles for success state */}
        {isSuccess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            {floatingParticles}
          </div>
        )}
        
        <CardHeader className="text-center pb-8 pt-8">
          {/* Icon container with enhanced animations */}
          <div className="mx-auto mb-6 relative">
            {isProcessing && (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-ping" />
              </div>
            )}
            
            {!isProcessing && isSuccess && (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center transform transition-all duration-1000 animate-bounce">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-20 animate-pulse" />
                <div className="absolute -inset-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-10 animate-ping" />
              </div>
            )}
            
            {!isProcessing && error && (
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -inset-2 bg-red-500 rounded-full opacity-20 animate-pulse" />
              </div>
            )}
          </div>
          
          {/* Enhanced titles with gradients */}
          <CardTitle className="text-2xl font-bold mb-3">
            {isProcessing && (
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Processing Your Subscription...
              </span>
            )}
            {!isProcessing && isSuccess && (
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent animate-pulse">
                🎉 Subscription Successful!
              </span>
            )}
            {!isProcessing && error && (
              <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Processing Failed
              </span>
            )}
          </CardTitle>
          
          <CardDescription className="text-base leading-relaxed">
            {isProcessing && (
              "Please wait while we confirm your payment and set up your subscription. This should only take a moment..."
            )}
            {!isProcessing && isSuccess && (
              <span className="text-green-700">
                Welcome to <span className="font-semibold text-green-800">{planName}</span>! 🚀 
                <br className="mb-1" />
                You'll be redirected to your dashboard shortly.
              </span>
            )}
            {!isProcessing && error && (
              "There was an issue processing your subscription. Don't worry - no charges were made. Please try again or contact our support team."
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center pb-8">
          {/* Enhanced buttons with better styling */}
          {!isProcessing && (
            <div className="space-y-4">
              <Button 
                onClick={handleRetryOrGoBack}
                className={`w-full h-12 text-base font-medium transition-all duration-300 transform hover:scale-105 ${
                  isSuccess 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg" 
                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                }`}
                variant={isSuccess ? "default" : "default"}
              >
                {isSuccess ? "🎯 Go to Dashboard" : "← Back to Pricing"}
              </Button>
              
              {isSuccess && (
                <p className="text-sm text-gray-500 animate-fade-in">
                  Redirecting automatically in <span className="font-mono">3</span> seconds...
                </p>
              )}
            </div>
          )}
          
          {/* Enhanced error display */}
          {error && (
            <div className="mt-6 p-4 text-sm text-red-700 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="font-medium">Error Details:</span>
              </div>
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {/* Processing state additional info */}
          {isProcessing && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Securing your subscription</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Success celebration text */}
      {isSuccess && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center animate-fade-in">
          <p className="text-lg font-medium bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Welcome to your new journey! ✨
          </p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}

// Loading component for Suspense fallback
function CheckoutSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="mx-auto mb-6 relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-ping" />
          </div>
          <CardTitle className="text-2xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading...
            </span>
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Preparing your checkout experience...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Main export with Suspense boundary
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessLoading />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
} 