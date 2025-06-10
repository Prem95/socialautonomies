"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, AlertCircle, Users, MessageSquare, Cpu, ArrowRight, Info, Edit3, AlertTriangle, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlanFeature {
  icon: React.ElementType;
  name: string;
  value: string | number;
  description?: string;
  currentUsage?: number;
  limit?: number;
}

interface UserProfile {
  userId: string;
  planId: string | null;
  customGenerationsUsed: number;
  tweetsUsed: number;
  repliesUsed?: number;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: {
    planId: string;
    planName: string;
    price: string;
    maxAgents: number;
    maxTweetsPerAgent: number;
    maxCustomGenerations: number;
    maxRepliesPerAgent?: number;
  } | null;
  usage: {
    agents: {
      current: number;
      max: number;
      available: number;
      percentage: number;
    };
    tweetsPerAgent: number;
  };
}

interface AgentQuota {
  used: number;
  limit: number;
  remaining: number;
  canCreate: boolean;
}

interface AgentStatusData {
  profile: UserProfile;
  usage: {
    agents: {
      current: number;
      max: number;
      available: number;
      percentage: number;
      active: number;
    };
    tweetsPerAgent: number;
    activity: {
      totalTweets: number;
      totalReplies: number;
      recentTweets: number;
      autoTweetEnabled: number;
      autoEngageEnabled: number;
    };
  };
  agents: any[];
  timestamp: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agentStatusData, setAgentStatusData] = useState<AgentStatusData | null>(null);
  const [quota, setQuota] = useState<AgentQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixingPlan, setIsFixingPlan] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  // Function to assign a plan to the profile
  const assignPlanToProfile = async () => {
    if (isFixingPlan) return;
    
    try {
      setIsFixingPlan(true);
      const response = await fetch('/api/profile/assign-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign plan');
      }
      
      const data = await response.json();
      toast({
        title: "Plan assigned",
        description: "Your account has been assigned a subscription plan."
      });
      
      // Refetch profile data
      fetchProfileData();
    } catch (error) {
      console.error('Error assigning plan:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to assign plan',
        variant: "destructive"
      });
    } finally {
      setIsFixingPlan(false);
    }
  };

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch agent status data (includes profile and real tweet counts)
      const statusResponse = await fetch('/api/agents/status');
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAgentStatusData(statusData);
        setProfile(statusData.profile);
      } else {
        // Fallback to regular profile endpoint if status fails
        const profileResponse = await fetch('/api/profile');
        
        if (!profileResponse.ok) {
          if (profileResponse.status === 404) {
            console.warn('Profile not found. This might be a new user.');
            setProfile(null);
          } else {
            throw new Error('Failed to fetch profile data');
          }
        } else {
          const profileData = await profileResponse.json();
          console.log('Full profile data:', JSON.stringify(profileData, null, 2));
          
          if (!profileData.planId || !profileData.plan) {
            console.warn('Warning: Profile has no planId or plan object!', {
              userId: profileData.userId,
              planInfo: profileData.plan,
            });
          }
          setProfile({
            ...profileData,
            plan: profileData.plan
          });
        }
      }
      
      // Fetch agent quota
      const quotaResponse = await fetch('/api/agents/quota');
      
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json();
        setQuota(quotaData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user, fetchProfileData]);

  // Re-fetch data when the window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchProfileData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchProfileData]);

  const planFeatures: PlanFeature[] = profile?.plan ? [
    {
      icon: Users,
      name: "AI Agents",
      value: profile.plan.maxAgents,
      description: "Maximum number of AI agents you can create and manage.",
      currentUsage: quota?.used,
      limit: quota?.limit
    },
    {
      icon: MessageSquare,
      name: "Total Tweets",
      value: `${agentStatusData?.usage?.activity?.totalTweets ?? 0} / ${profile.plan.maxTweetsPerAgent}`,
      description: "Total number of tweets posted by all your agents against your plan limit.",
      currentUsage: agentStatusData?.usage?.activity?.totalTweets ?? 0,
      limit: profile.plan.maxTweetsPerAgent
    },
    {
      icon: MessageCircle,
      name: "Smart Replies",
      value: `${profile.repliesUsed || 0} / ${profile.plan.maxRepliesPerAgent || 50}`,
      description: "Number of smart replies posted by your agents this month.",
      currentUsage: profile.repliesUsed || 0,
      limit: profile.plan.maxRepliesPerAgent || 50
    },
    {
      icon: Cpu,
      name: "Custom Generations",
      value: `${profile.customGenerationsUsed} / ${profile.plan.maxCustomGenerations}`,
      description: "Number of custom content generations used out of your monthly allowance.",
      currentUsage: profile.customGenerationsUsed,
      limit: profile.plan.maxCustomGenerations
    },
  ] : [];
  
  const getUsagePercentage = (used?: number, limit?: number) => {
    if (typeof used === 'number' && typeof limit === 'number' && limit > 0) {
      // Cap at 100% to prevent progress bar overflow
      return Math.min((used / limit) * 100, 100);
    }
    return 0;
  };

  const isOverLimit = (used?: number, limit?: number) => {
    return typeof used === 'number' && typeof limit === 'number' && used > limit;
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Your Profile"
        text=""
      />
      
      {isLoading ? (
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-8"
        >
          <AnimatePresence>
            {!profile?.planId && !isFixingPlan && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="border-2 border-destructive/50 shadow-lg">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle className="font-semibold text-lg">Subscription Issue Detected</AlertTitle>
                  <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-1">
                    <span className="mb-2 sm:mb-0">Your account currently doesn't have an active subscription plan. Please assign one to continue.</span>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="shrink-0 bg-white hover:bg-gray-100 text-destructive-foreground"
                      onClick={assignPlanToProfile}
                      disabled={isFixingPlan}
                    >
                      {isFixingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                      Assign Default Plan
                    </Button>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <p className="text-base font-semibold">{user?.email || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p className="text-base font-semibold">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : "N/A"}
                  </p>
                </div>
                
                {profile?.plan && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                      <p className="text-base font-semibold flex items-center flex-wrap">
                        {profile.plan.planName}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
                      <p className="text-base font-semibold text-blue-600">
                        Monthly Subscription
                      </p>
                    </div>
                    
                    {profile.currentPeriodEnd && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                        <p className="text-base font-semibold">
                          {new Date(profile.currentPeriodEnd).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {profile.cancelAtPeriodEnd && (
                            <span className="text-sm text-orange-600 ml-2 font-normal">(Canceling)</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className={`text-base font-semibold capitalize ${
                        profile.subscriptionStatus === 'active' ? 'text-green-600' : 
                        profile.subscriptionStatus === 'past_due' ? 'text-orange-600' : 
                        'text-gray-600'
                      }`}>
                        {profile.subscriptionStatus || 'Active'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {profile?.plan ? (
              <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <CardTitle className="text-2xl mb-1">Subscription Plan</CardTitle>
                      <CardDescription>Overview of your current plan and usage.</CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-3 sm:mt-0 shrink-0"
                      onClick={() => router.push('/pricing')}
                    >
                      Manage Subscription
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-2">
                  <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-lg border border-primary/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
                          <p className="text-2xl font-bold text-primary flex items-center flex-wrap">
                            {profile.plan.planName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white/50 p-3 rounded-md">
                          <p className="text-xs text-muted-foreground">Monthly Price</p>
                          <p className="text-xl font-bold text-primary">
                            ${parseFloat(profile.plan.price || "0").toFixed(0)}
                            <span className="text-sm font-normal">/month</span>
                          </p>
                        </div>
                      </div>
                  </div>

                  {planFeatures.map((feature, index) => (
                    <div key={index} className="space-y-2 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <feature.icon className={`h-5 w-5 mr-3 ${
                            isOverLimit(feature.currentUsage, feature.limit) ? 'text-red-500' : 'text-primary'
                          }`} />
                          <span className="text-md font-medium">{feature.name}</span>
                          {isOverLimit(feature.currentUsage, feature.limit) && (
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 ml-1.5 text-red-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>You have exceeded the limit for this feature. Consider upgrading your plan.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {feature.description && (
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 ml-1.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>{feature.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <span className={`text-md font-semibold ${
                          isOverLimit(feature.currentUsage, feature.limit) ? 'text-red-600' : ''
                        }`}>
                          {typeof feature.value === 'string' && feature.value.includes('/') 
                           ? feature.value
                           : feature.limit
                             ? `${feature.currentUsage ?? 0} / ${feature.limit}`
                             : feature.value}
                          {isOverLimit(feature.currentUsage, feature.limit) && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                              Over Limit
                            </span>
                          )}
                        </span>
                      </div>
                      {(feature.name === "AI Agents" || feature.name === "Custom Generations" || feature.name === "Total Tweets" || feature.name === "Smart Replies") && typeof feature.currentUsage === 'number' && typeof feature.limit === 'number' && feature.limit > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getUsagePercentage(feature.currentUsage, feature.limit)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                           <Progress 
                             value={getUsagePercentage(feature.currentUsage, feature.limit)} 
                             className={`h-2 ${
                               isOverLimit(feature.currentUsage, feature.limit) 
                                 ? '[&>div]:bg-red-500' 
                                 : '[&>div]:bg-primary'
                             }`} 
                           />
                        </motion.div>
                      )}
                       {(feature.name === "AI Agents" && quota) && (
                         <p className={`text-xs mt-1 ${
                           isOverLimit(quota.used, quota.limit)
                             ? 'text-red-600 font-medium'
                             : 'text-muted-foreground'
                         }`}>
                           {isOverLimit(quota.used, quota.limit)
                             ? `You've exceeded your agent limit by ${quota.used - quota.limit}. Consider upgrading your plan or removing some agents.`
                             : quota.remaining > 0 
                               ? `${quota.remaining} agent${quota.remaining === 1 ? '' : 's'} can still be created.`
                               : "You've reached your agent limit."}
                         </p>
                       )}
                       {(feature.name === "Total Tweets" && profile.plan && agentStatusData) && (
                         <p className={`text-xs mt-1 ${
                           isOverLimit(agentStatusData.usage.activity.totalTweets, profile.plan.maxTweetsPerAgent)
                             ? 'text-red-600 font-medium'
                             : 'text-muted-foreground'
                         }`}>
                           {isOverLimit(agentStatusData.usage.activity.totalTweets, profile.plan.maxTweetsPerAgent)
                             ? `You've exceeded your limit by ${agentStatusData.usage.activity.totalTweets - profile.plan.maxTweetsPerAgent} tweet${agentStatusData.usage.activity.totalTweets - profile.plan.maxTweetsPerAgent === 1 ? '' : 's'}. Consider upgrading your plan.`
                             : profile.plan.maxTweetsPerAgent - agentStatusData.usage.activity.totalTweets > 0
                               ? `${profile.plan.maxTweetsPerAgent - agentStatusData.usage.activity.totalTweets} tweet${profile.plan.maxTweetsPerAgent - agentStatusData.usage.activity.totalTweets === 1 ? '' : 's'} remaining`
                               : "You've used all your tweets."}
                         </p>
                       )}
                       {(feature.name === "Custom Generations" && profile.plan) && (
                         <p className={`text-xs mt-1 ${
                           isOverLimit(profile.customGenerationsUsed, profile.plan.maxCustomGenerations)
                             ? 'text-red-600 font-medium'
                             : 'text-muted-foreground'
                         }`}>
                           {isOverLimit(profile.customGenerationsUsed, profile.plan.maxCustomGenerations)
                             ? `You've exceeded your limit by ${profile.customGenerationsUsed - profile.plan.maxCustomGenerations} generation${profile.customGenerationsUsed - profile.plan.maxCustomGenerations === 1 ? '' : 's'}. Consider upgrading your plan.`
                             : profile.plan.maxCustomGenerations - profile.customGenerationsUsed > 0
                               ? `${profile.plan.maxCustomGenerations - profile.customGenerationsUsed} generation${profile.plan.maxCustomGenerations - profile.customGenerationsUsed === 1 ? '' : 's'} remaining`
                               : "You've used all your custom generations."}
                         </p>
                       )}
                       {(feature.name === "Smart Replies" && profile.plan) && (
                         <p className={`text-xs mt-1 ${
                           isOverLimit(profile.repliesUsed || 0, profile.plan.maxRepliesPerAgent || 50)
                             ? 'text-red-600 font-medium'
                             : 'text-muted-foreground'
                         }`}>
                           {isOverLimit(profile.repliesUsed || 0, profile.plan.maxRepliesPerAgent || 50)
                             ? `You've exceeded your limit by ${(profile.repliesUsed || 0) - (profile.plan.maxRepliesPerAgent || 50)} reply${(profile.repliesUsed || 0) - (profile.plan.maxRepliesPerAgent || 50) === 1 ? '' : 'ies'}. Upgrade to Expert plan for 200 replies/month.`
                             : (profile.plan.maxRepliesPerAgent || 50) - (profile.repliesUsed || 0) > 0
                               ? `${(profile.plan.maxRepliesPerAgent || 50) - (profile.repliesUsed || 0)} repl${(profile.plan.maxRepliesPerAgent || 50) - (profile.repliesUsed || 0) === 1 ? 'y' : 'ies'} remaining this month`
                               : "You've used all your smart replies this month."}
                         </p>
                       )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
               <Card className="lg:col-span-2 shadow-lg flex flex-col items-center justify-center p-8 text-center">
                  <CardHeader>
                    <CardTitle className="text-xl">No Active Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      It appears you don't have an active subscription. Please choose a plan to unlock features.
                    </p>
                    <Button onClick={() => router.push('/pricing')}>
                      View Pricing Plans
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
               </Card>
            )}
          </div>
        </motion.div>
      )}
    </DashboardShell>
  );
} 