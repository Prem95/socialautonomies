"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { API_ENDPOINTS } from "@/app/config/constants";
import { DashboardModalState } from "../hooks/use-dashboard-state";
import { TwitterCredentialPrompt } from "@/components/twitter-credential-prompt";
import { Agent } from "./types";
import { EmptyState } from "./components/empty-state";
import { AgentsList } from "./components/agents-list";

// Dynamic imports with SSR disabled for better performance
const AgentDetailView = dynamic(() => 
  import("@/components/dashboard/agent-detail-view").then(mod => ({ default: mod.AgentDetailView })), {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
);

const DashboardModals = dynamic(() => 
  import("@/components/dashboard/modals").then(mod => ({ default: mod.DashboardModals })), {
    ssr: false,
    loading: () => null,
  }
);

export default function AgentsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [twitterCredentialsModal, setTwitterCredentialsModal] = useState({
    isOpen: false,
    agentId: ""
  });
  
  const { toast } = useToast();
  const { refreshSession } = useAuthRefresh();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize modal state
  const [modalState, setModalState] = useState<DashboardModalState>({
    tweet: {
      isOpen: false,
      agentId: null,
      isLoading: false,
      progress: 0,
      text: '',
      generatedText: '',
      context: '',
      url: '',
      xAccountToTag: '',
      stage: 'idle',
      isScheduleEnabled: false,
      scheduleTime: ''
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

  // Optimized OAuth callback handler
  const handleOAuthCallback = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const oauthSuccess = urlParams.get('oauth_success');
        const oauthError = urlParams.get('oauth_error');
        const agentId = urlParams.get('agentId');

        if (oauthSuccess === 'true' && agentId) {
            toast({
                title: "X Account Connected",
                description: `Successfully connected X account for agent. You can now deploy it.`,
            });
            fetchAgents();
        } else if (oauthError) {
            toast({
                title: "X Connection Failed",
                description: decodeURIComponent(oauthError) || 'Failed to connect X account.',
                variant: 'destructive',
            });
        }

        if (oauthSuccess || oauthError) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('oauth_success');
          currentUrl.searchParams.delete('oauth_error');
          currentUrl.searchParams.delete('agentId');
          currentUrl.searchParams.delete('oauth_token');
          currentUrl.searchParams.delete('oauth_verifier');
          window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
        }
  }, [toast]);

  // Optimized profile fetching
  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get("/api/profile", {
        withCredentials: true,
        timeout: 10000
      });
      setProfile(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.location.href = "/login?redirect=/dashboard/agents";
      } else {
        console.warn("Profile fetch failed, but continuing with agent list...");
      }
    }
  }, []);

  // Optimized agents fetching
  const fetchAgents = useCallback(async () => {
    try {
      const response = await axios.get("/api/agents", {
        timeout: 15000
      });
      setAgents(response.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error Loading Agents",
        description: "Failed to load your agents. Please try refreshing.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Optimized initialization with parallel API calls
  const initializePage = useCallback(async () => {
    try {
      setIsLoading(true);
      const success = await refreshSession();
      if (success) {
        // Run profile and agents fetch in parallel
        await Promise.allSettled([
          fetchProfile(),
          fetchAgents()
        ]);
      } else {
        window.location.href = "/login?redirect=/dashboard/agents";
      }
    } catch (error) {
      console.error("Error initializing agents page:", error);
      toast({
        title: "Initialization Error",
        description: "Failed to load page. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession, fetchProfile, fetchAgents, toast]);

  useEffect(() => {
    initializePage();
    handleOAuthCallback();
  }, [pathname, initializePage, handleOAuthCallback]);

  // Optimized refresh function
  const refreshAgents = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await Promise.allSettled([
        fetchAgents(),
        fetchProfile()
      ]);
      
      toast({
        title: "Refreshed",
        description: "Agent list and profile data updated.",
      });
    } catch (error) {
      console.error("Error refreshing agents:", error);
       toast({
        title: "Refresh Failed",
        description: "Could not refresh agent data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAgents, fetchProfile, toast]);

  // Agent action handlers with useCallback optimization
  const handleStartAgent = useCallback(async (agentId: string) => {
    const agent = agents.find(a => a.agentId === agentId);
    if (!agent) return;

    if (agent.status === 'stopped' && agent.isTwitterConnected) {
      setActionLoading(agentId);
      try {
        const response = await axios.post(`/api/agents/${agentId}/validate-deploy`, {}, {
          timeout: 15000
        });
        
        // Optimistic update - immediately set status to running
        setAgents(currentAgents => 
          currentAgents.map(a => 
            a.agentId === agentId 
              ? { ...a, status: 'running' }
              : a
          )
        );
        
        toast({
          title: "Agent Deployment Started",
          description: response.data.message || `Agent ${agent.name} deployment initiated.`,
        });
        
        // Also refresh agents to get any other updates from the server
        setTimeout(() => {
          fetchAgents();
        }, 1000);
      } catch (error) {
        console.error("Error deploying agent:", error);
        let errorMessage = "Failed to deploy agent.";
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 428 && error.response.data?.error === 'CREDENTIALS_REQUIRED') {
            setTwitterCredentialsModal({
              isOpen: true,
              agentId
            });
            return;
          }
          
          errorMessage = error.response?.data?.error || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Deployment Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setActionLoading(null);
      }
    } else if (agent.status === 'stopped' && !agent.isTwitterConnected) {
      setActionLoading(agentId);
      try {
        const response = await axios.get(`/api/twitter/oauth/initiate?agentId=${agentId}`, {
          timeout: 10000
        });
        if (response.data.authUrl) {
          window.location.href = response.data.authUrl;
        } else {
          throw new Error("No authorization URL received from server.");
        }
      } catch (error) {
        console.error("Error initiating X OAuth:", error);
        let errorMessage = "Could not start X connection process.";
        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.error || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast({ title: "X Connection Failed", description: errorMessage, variant: "destructive"});
        setActionLoading(null);
      }
    } else if (agent.status === 'running') {
      toast({ title: "Agent Already Running", description: "This agent is already active." });
    }
  }, [agents, toast]);

  const handleStopAgent = useCallback(async (agentId: string) => {
    setActionLoading(agentId);
    try {
      const response = await axios.post<{ message: string, agent: Agent }>(
        API_ENDPOINTS.AGENT_STOP(agentId),
        {},
        { timeout: 15000 }
      );
      const message = response.data.message || "The agent stop command has been sent.";

      toast({
        title: "Agent Stopped",
        description: message,
      });

      await fetchAgents();
    } catch (error) {
      console.error("Error stopping agent:", error);
      let errorMessage = "An unexpected error occurred while stopping the agent.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || "Failed to communicate with the server.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Failed to Stop Agent",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }, [toast, fetchAgents]);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    if (!window.confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      return;
    }
    
    setActionLoading(agentId);
    try {
      await axios.delete(API_ENDPOINTS.AGENT_DETAIL(agentId), {
        timeout: 10000
      }); 
      
      toast({
        title: "Agent Deleted",
        description: "The agent has been successfully deleted.",
      });
      
      setAgents(prevAgents => prevAgents.filter(agent => agent.agentId !== agentId)); 
    } catch (error) {
      console.error("Error deleting agent:", error);
       let errorMessage = "An unexpected error occurred while deleting the agent.";
       if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.error || "Failed to communicate with the server.";
        } else if (error instanceof Error) {
           errorMessage = error.message;
       }
      toast({
        title: "Failed to Delete Agent",
        description: errorMessage,
        variant: "destructive",
      });
       setActionLoading(null);
    } 
  }, [toast]);

  const handleDisconnectX = useCallback(async (agentId: string) => {
    const agent = agents.find(a => a.agentId === agentId);
    if (!agent) return;

    if (!window.confirm(`Are you sure you want to disconnect the X account @${agent.twitterUsername || '...'} for agent "${agent.name}"? The agent will stop if running.`)) {
      return;
    }

    const loadingKey = `disconnect_${agentId}`;
    setActionLoading(loadingKey); 
    
    try {
      const response = await axios.post(`/api/agents/${agentId}/disconnect`, {}, {
        timeout: 10000, // Reduced timeout for better UX
        signal: AbortSignal.timeout(10000) // Add abort signal for better cancellation
      });
      
      const data = response.data;

      if (data.success && data.agent) {
        // Optimistic update - immediately update the UI
        setAgents(currentAgents =>
          currentAgents.map(a =>
            a.agentId === agentId ? { 
              ...a, 
              twitterUsername: null, 
              isTwitterConnected: false 
            } : a
          )
        );
        
        toast({
          title: "X Account Disconnected",
          description: `The X account connection for agent "${agent.name}" has been removed.`,
        });
      } else {
        // Fallback: refetch if response doesn't include agent data
        console.warn("Disconnect API did not return expected data, refetching list.");
        await fetchAgents();
        toast({
          title: "X Account Disconnected",
          description: `The X account connection for agent "${agent.name}" has been removed.`,
        });
      }
    } catch (error) {
      console.error("Error disconnecting X account:", error);
      let errorMessage = "Could not disconnect X account.";
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else {
          errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "Disconnection Failed", 
        description: errorMessage, 
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  }, [agents, toast, fetchAgents]);

  // Modal handlers with useCallback optimization
  const openTweetModal = useCallback((agentId: string) => {
    setModalState(prevState => ({
      ...prevState,
      tweet: {
        ...prevState.tweet,
        isOpen: true,
        agentId: agentId,
        text: '',
        generatedText: '',
        context: '',
        stage: 'idle',
        progress: 0,
        isScheduleEnabled: false,
        scheduleTime: ''
      }
    }));
  }, []);

  const openAutoTweetModal = useCallback((agent: Agent) => {
    const frequency = agent.autoTweetFrequencyHours || 4;
    const count = agent.autoTweetCount || 1;
    
    setModalState(prevState => ({
      ...prevState,
      autoTweet: {
        ...prevState.autoTweet,
        isOpen: true,
        agentId: agent.agentId,
        frequency,
        count
      }
    }));
  }, []);

  const openAutoEngageModal = useCallback((agent: Agent) => {
    setModalState(prevState => ({
      ...prevState,
      autoEngage: {
        ...prevState.autoEngage,
        isOpen: true,
        agentId: agent.agentId,
        frequency: agent.autoEngageFrequencyHours || 4,
        maxReplies: agent.autoEngageMaxReplies || 3,
        minScore: agent.autoEngageMinScore || 15,
        autoReply: agent.autoEngageAutoReply || false
      }
    }));
  }, []);

  const disableAutoTweet = useCallback(async (agentId: string) => {
     if (!agentId) return;
    
    const loadingKey = `${agentId}_auto`; 
    setActionLoading(loadingKey);
    
    try {
      await axios.patch(API_ENDPOINTS.AGENT_DETAIL(agentId), {
        autoTweetEnabled: false,
      }, { timeout: 10000 });
      
      toast({
        title: "Auto-Tweet Disabled",
        description: `Agent automatic tweeting has been turned off.`,
      });
      
      fetchAgents();
    } catch (error) {
      console.error("Error disabling auto-tweet:", error);
      let errorMessage = "An unexpected error occurred.";
       if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.error || "Failed to communicate with the server.";
        } else if (error instanceof Error) {
           errorMessage = error.message;
       }
      toast({
        title: "Failed to Disable Auto-Tweet",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }, [toast, fetchAgents]);
  
  const getStatusBadge = useCallback((status: string) => {
    const lowerStatus = status?.toLowerCase(); 
    const colors = {
      running: 'bg-green-600 border-green-700/50 text-green-50',
      stopped: 'bg-red-700 border-red-800/50 text-red-50',
      error:   'bg-red-700 border-red-800/50 text-red-50',
      pending: 'bg-yellow-500 border-yellow-600/50 text-yellow-950',
      connecting: 'bg-blue-600 border-blue-700/50 text-blue-50',
      default: 'bg-secondary text-secondary-foreground'
    };

    const baseBadgeClasses = "border px-2.5 py-0.5 text-xs font-semibold";

    switch (lowerStatus) {
      case "running":
      case "active":
        return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.running}`}>Active</Badge>;
      case "stopped":
        return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.stopped}`}>Stopped</Badge>;
      case "error":
         return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.error}`}>Error</Badge>;
      case "pending":
         return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.pending}`}>Pending</Badge>;
       case "connecting":
         return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.connecting}`}>Connecting</Badge>; 
      default:
        const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
        return <Badge variant="outline" className={`${baseBadgeClasses} ${colors.default}`}>{formattedStatus}</Badge>;
    }
  }, []);

  const openEditModal = useCallback((agent: Agent) => {
    router.push(`/dashboard/agents/edit/${agent.agentId}`);
  }, [router]);

  const refreshAgentDetail = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleTwitterCredentialsSubmit = useCallback(async () => {
    // First refresh agents to get updated Twitter connection status
    await fetchAgents();
    // Then start the agent (which will now see isTwitterConnected = true)
    handleStartAgent(twitterCredentialsModal.agentId);
  }, [fetchAgents, handleStartAgent, twitterCredentialsModal.agentId]);

  // Memoized components
  const memoizedAgentsList = useMemo(() => (
    <AgentsList
      agents={agents}
      actionLoading={modalState.actionLoading || actionLoading}
      profile={profile}
      handleStartAgent={handleStartAgent}
      handleStopAgent={handleStopAgent}
      handleDeleteAgent={handleDeleteAgent}
      handleDisconnectX={handleDisconnectX}
      openTweetModal={openTweetModal}
      openAutoTweetModal={openAutoTweetModal}
      openAutoEngageModal={openAutoEngageModal}
      disableAutoTweet={disableAutoTweet}
      getStatusBadge={getStatusBadge}
      setActionLoading={setActionLoading}
      openEditModal={openEditModal}
    />
  ), [
    agents, modalState.actionLoading, actionLoading, profile,
    handleStartAgent, handleStopAgent, handleDeleteAgent, handleDisconnectX,
    openTweetModal, openAutoTweetModal, openAutoEngageModal, disableAutoTweet,
    getStatusBadge, openEditModal
  ]);

  const memoizedEmptyState = useMemo(() => (
    <EmptyState profile={profile} />
  ), [profile]);

  return (
    <DashboardShell>
      <div className="flex items-center justify-between text-primary">
        <DashboardHeader heading="Agent Management" />
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </Button>
          ) : profile?.usage?.agents?.available <= 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <div>
                    <Button variant="outline" disabled>
                       <PlusCircle className="mr-2 h-4 w-4" />
                       Create Agent 
                    </Button>
                   </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Agent limit reached. <Link href="/pricing" className="underline text-primary">Upgrade Plan?</Link></p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button asChild className="hover:scale-105 transition-transform">
              <Link href="/dashboard/agents/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Agent
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      {profile?.usage && (
        <Card className="mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium">
                 Agent Usage ({profile.usage.agents.current}/{profile.usage.agents.max})
              </CardTitle>
              {profile.usage.agents.available <= 0 && (
                <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
                   <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-2 mt-1">
               <Progress 
                   value={profile.usage.agents.percentage ?? 0}
                   className="h-2 flex-grow" 
                   aria-label={`${profile.usage.agents.percentage ?? 0}% agent capacity used`}
               />
              <span className="text-xs text-muted-foreground tabular-nums"> 
                   {profile.usage.agents.percentage?.toFixed(0) ?? 0}% 
               </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedAgentId ? (
        <AgentDetailView 
          agentId={selectedAgentId}
          refreshTrigger={refreshTrigger}
          onBack={() => setSelectedAgentId(null)}
          onRefresh={refreshAgentDetail}
          isRefreshing={isRefreshing}
        />
      ) : (
        isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-lg text-muted-foreground">Loading your agents...</span>
            </div>
          </div>
        ) : agents.length === 0 ? (
          memoizedEmptyState
        ) : (
          memoizedAgentsList
        )
      )}

      <DashboardModals 
        modalState={modalState}
        setModalState={setModalState}
        agents={agents}
        setAgents={setAgents}
        refreshAgents={fetchAgents}
      />

      <TwitterCredentialPrompt
        isOpen={twitterCredentialsModal.isOpen}
        onClose={() => setTwitterCredentialsModal({ isOpen: false, agentId: "" })}
        agentId={twitterCredentialsModal.agentId}
        onSuccess={handleTwitterCredentialsSubmit}
      />
    </DashboardShell>
  );
}