import { useState, useCallback } from "react";
import axios from "axios";
import { ToastActionElement } from "@/components/ui/toast";

// Type definitions
export interface Agent {
  agentId: string;
  name: string;
  goal: string;
  status: string;
  language: string;
  startTime?: Date | null;
  endTime?: Date | null;
  autoTweetEnabled: boolean;
  autoTweetFrequencyHours?: number | null;
  autoTweetCount?: number | null;
  autoEngageEnabled?: boolean;
  autoEngageFrequencyHours?: number | null;
  autoEngageMaxReplies?: number | null;
  autoEngageMinScore?: number | null;
  autoEngageAutoReply?: boolean;
  isTwitterConnected?: boolean;
  twitterUsername?: string | null;
}

export interface ProfileUsage {
  agents: {
    current: number;
    max: number;
    available: number;
    percentage?: number;
  };
}

export interface Profile {
  userId: string;
  email?: string;
  usage?: ProfileUsage;
}

// Modal state interfaces
export interface EditAgentModalState {
  isOpen: boolean;
  agent: Agent | null;
}

export interface TweetModalState {
  isOpen: boolean;
  agentId: string | null;
  text: string;
  generatedText: string;
  context: string;
  url: string;
  xAccountToTag: string;
  stage: 'idle' | 'generating' | 'posting' | 'complete' | 'error';
  progress: number;
  isLoading: boolean;
  isScheduleEnabled: boolean;
  scheduleTime: string;
  generationsInfo?: {
    used: number;
    total: number;
    remaining: number;
  };
}

export interface AutoTweetModalState {
  isOpen: boolean;
  agentId: string | null;
  frequency: number;
  count: number;
}

export interface AutoEngageModalState {
  isOpen: boolean;
  agentId: string | null;
  frequency: number;
  maxReplies: number;
  minScore: number;
  autoReply: boolean;
}

// Combined modal state interface
export interface DashboardModalState {
  tweet: TweetModalState;
  autoTweet: AutoTweetModalState;
  autoEngage: AutoEngageModalState;
  edit: EditAgentModalState;
  actionLoading: string | null;
}

// Hook props
interface UseDashboardStateProps {
  toast: {
    (props: {
      title?: string;
      description?: React.ReactNode;
      action?: ToastActionElement;
      variant?: "default" | "destructive";
      duration?: number;
    }): void;
  };
  setIsLoading: (isLoading: boolean) => void;
}

export function useDashboardState({ toast, setIsLoading }: UseDashboardStateProps) {
  // Core state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dashboardData, setDashboardData] = useState<{
    stats?: {
      totalAgents: number;
      maxAgentsAllowed: number;
      activeAgents: number;
      totalTweets: number;
      uptime: string;
      engagementRate: string;
      growthRate: string;
    };
    usage?: any;
    agents?: Agent[];
    profile?: any;
  }>({});
  
  // Agent metrics state
  const [agentMetrics, setAgentMetrics] = useState<{
    tweets: number;
    followers: number;
    engagement: string;
    following: number;
  } | null>(null);

  // Modal state initialization
  const [modalState, setModalState] = useState<DashboardModalState>({
    tweet: {
      isOpen: false,
      agentId: null,
      text: '',
      generatedText: '',
      context: '',
      url: '',
      xAccountToTag: '',
      stage: 'idle',
      progress: 0,
      isLoading: false,
      isScheduleEnabled: false,
      scheduleTime: '',
      generationsInfo: undefined
    },
    autoTweet: {
      isOpen: false,
      agentId: null,
      frequency: 4,
      count: 1
    },
    autoEngage: {
      isOpen: false,
      agentId: null,
      frequency: 4,
      maxReplies: 3,
      minScore: 15,
      autoReply: false
    },
    edit: {
      isOpen: false,
      agent: null
    },
    actionLoading: null
  });

  // Consolidated dashboard data fetching - replaces fetchProfile, fetchAgents, and fetchStats
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await axios.get("/api/dashboard", {
        timeout: 15000 // 15 second timeout
      });
      
      const data = response.data;
      
      // Update all state from consolidated response
      setProfile({
        userId: data.profile.userId,
        email: data.profile.email, // Will be undefined but that's ok
        usage: data.profile.usage // Use profile.usage from the response
      });
      
      setAgents(data.agents);
      
      // Transform data to match expected stats structure for AgentOverviewPanel
      const statsData = {
        totalAgents: data.usage.agents.current,
        maxAgentsAllowed: data.usage.agents.max,
        activeAgents: data.usage.agents.active,
        totalTweets: data.usage.activity.totalTweets,
        uptime: "0h 0m", // This will be calculated later
        engagementRate: "0%", // This will be calculated later
        growthRate: "0%" // This will be calculated later
      };
      
      // Store additional dashboard data for components
      setDashboardData({
        stats: statsData,
        usage: data.usage,
        agents: data.agents,
        profile: data.profile
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.location.href = "/login?redirect=/dashboard";
        return;
      }
      toast({
        title: "Error Loading Dashboard",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, setIsLoading]);

  // Legacy methods for backward compatibility - now use consolidated endpoint
  const fetchProfile = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchAgents = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Optimized agent metrics fetching with caching
  const fetchAgentMetrics = useCallback(async (agentId: string) => {
    // Check if we already have the agent data
    let agent: Agent | undefined = agents.find(a => a.agentId === agentId);
    
    // If not found, fetch it
    if (!agent) {
      try {
        const agentResponse = await axios.get(`/api/agents/${agentId}`, {
          timeout: 10000
        });
        agent = agentResponse.data;
      } catch (error) {
        console.error(`Error fetching details for agent ${agentId}:`, error);
        setSelectedAgentId(null);
        return;
      }
    }

    // If agent is connected, fetch Twitter profile
    if (agent?.isTwitterConnected && agent.twitterUsername) {
      try {
        const profileResponse = await axios.get("/api/twitter/profile/me", {
          timeout: 15000
        });
        const profileData = profileResponse.data?.profile;

        if (profileData) {
          // Calculate engagement rate
          const likes = profileData.public_metrics?.like_count ?? 0;
          const tweets = profileData.public_metrics?.tweet_count ?? 0;
          const engagementRate = tweets > 0 ? ((likes / tweets) * 100).toFixed(1) + "%" : "0%";

          setAgentMetrics({
            tweets: tweets,
            followers: profileData.public_metrics?.followers_count ?? 0,
            following: profileData.public_metrics?.following_count ?? 0,
            engagement: engagementRate,
          });
        } else {
          console.warn(`No profile data received for agent ${agentId}`);
          setAgentMetrics(null);
        }
      } catch (error) {
        console.error(`Error fetching Twitter profile for agent ${agentId}:`, error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          toast({
            title: "X Session Invalid",
            description: "Could not fetch X profile data. Session may be expired.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: "Could not load X profile data.",
            variant: "destructive"
          });
        }
        setAgentMetrics(null);
      }
    } else {
      setAgentMetrics(null);
    }
  }, [agents, toast, setSelectedAgentId]);

  // Optimized dashboard refresh function - uses consolidated endpoint
  const refreshDashboard = useCallback(async () => {
    try {
      await fetchDashboardData();
      
      // If an agent is selected, refresh its metrics
      if (selectedAgentId) {
        await fetchAgentMetrics(selectedAgentId);
      }
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  }, [fetchDashboardData, selectedAgentId, fetchAgentMetrics]);

  // Open edit modal function
  const openEditModal = useCallback((agent: Agent) => {
    setModalState(prevState => ({
      ...prevState,
      edit: {
        isOpen: true,
        agent: agent
      }
    }));
  }, []);

  return {
    // State
    agents,
    profile,
    selectedAgentId,
    refreshTrigger,
    agentMetrics,
    modalState,
    dashboardData,
    
    // State setters
    setAgents,
    setProfile,
    setSelectedAgentId,
    setRefreshTrigger,
    setAgentMetrics,
    setModalState,
    setDashboardData,
    
    // Modal functions
    openEditModal,
    
    // Data fetching
    fetchProfile,
    fetchAgents,
    fetchAgentMetrics,
    refreshDashboard
  };
} 