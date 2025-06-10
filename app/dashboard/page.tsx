"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { DashboardShell } from "@/components/dashboard/shell";
import { AgentOverviewPanel } from "@/components/dashboard/agents/overview-panel";
import { AgentPerformanceOverview } from "@/components/dashboard/agents/performance/agent-performance-overview";
import { useToast } from "@/hooks/use-toast";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useDashboardState } from "@/app/dashboard/hooks/use-dashboard-state";
import { AgentDetailView } from "@/components/dashboard/agent-detail-view";
import { DashboardModals } from "@/components/dashboard/modals";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { refreshSession } = useAuthRefresh();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    agents, 
    selectedAgentId,
    refreshTrigger,
    dashboardData,
    setSelectedAgentId,
    setAgents,
    modalState,
    setModalState,
    openEditModal,
    fetchAgents,
    fetchProfile,
    fetchAgentMetrics,
    refreshDashboard,
  } = useDashboardState({ toast, setIsLoading });

  // Memoized OAuth callback handler
  const handleOAuthCallback = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const agentIdParam = urlParams.get('agentId');

    if (oauthSuccess === 'true' && agentIdParam) {
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

    // Clean up URL parameters after handling
    if (oauthSuccess || oauthError) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('oauth_success');
      currentUrl.searchParams.delete('oauth_error');
      currentUrl.searchParams.delete('agentId');
      currentUrl.searchParams.delete('oauth_token');
      currentUrl.searchParams.delete('oauth_verifier');
      window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
    }
  }, [toast, fetchAgents]);

  // Optimized initialization with consolidated data fetching
  const initializeDashboard = useCallback(async () => {
    try {
      const success = await refreshSession();
      if (success) {
        // Use consolidated endpoint for much faster loading
        await fetchProfile(); // This now calls fetchDashboardData internally
        setIsInitialized(true);
      } else {
        window.location.href = "/login?redirect=/dashboard";
      }
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to initialize dashboard. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession, fetchProfile, toast]);

  // Initial fetch and setup - only run once
  useEffect(() => {
    if (isInitialized) return;
    
    initializeDashboard();
    handleOAuthCallback();

    // Setup auto-refresh interval - increased to 10 minutes for better performance
    refreshIntervalRef.current = setInterval(() => {
      refreshDashboard();
    }, 600000); // 10 minutes

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isInitialized, initializeDashboard, handleOAuthCallback, refreshDashboard]);

  // Optimized agent metrics loading
  useEffect(() => {
    if (selectedAgentId && isInitialized) {
      fetchAgentMetrics(selectedAgentId);
    }
  }, [selectedAgentId, refreshTrigger, isInitialized, fetchAgentMetrics]);

  // Handle checkout success
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      toast({
        title: "Subscription Successful",
        description: "Your subscription has been processed successfully!",
        variant: "default",
        duration: 5000,
      });
      // Clean up URL parameter
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('success');
      window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
    }
  }, [searchParams, toast]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshDashboard]);

  // Memoized components to prevent unnecessary re-renders
  const memoizedOverviewPanel = useMemo(() => (
    <AgentOverviewPanel 
      key={`overview-${refreshTrigger}`} 
      stats={dashboardData.stats}
    />
  ), [refreshTrigger, dashboardData.stats]);

  const memoizedPerformanceOverview = useMemo(() => (
    <AgentPerformanceOverview
      key={`perf-overview-${refreshTrigger}`}
      refreshTrigger={refreshTrigger}
      onAgentSelect={setSelectedAgentId}
      openEditModal={openEditModal}
      agents={agents}
      dashboardData={dashboardData}
    />
  ), [refreshTrigger, setSelectedAgentId, openEditModal, agents, dashboardData]);

  const memoizedAgentDetail = useMemo(() => (
    selectedAgentId ? (
      <AgentDetailView
        agentId={selectedAgentId}
        refreshTrigger={refreshTrigger}
        onBack={() => setSelectedAgentId(null)}
        onRefresh={() => fetchAgentMetrics(selectedAgentId)}
        isRefreshing={isRefreshing}
      />
    ) : null
  ), [selectedAgentId, refreshTrigger, setSelectedAgentId, fetchAgentMetrics, isRefreshing]);

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Dashboard
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Overall Statistics Panel */}
      <div className="mb-6">
        {memoizedOverviewPanel}
      </div>

      {/* Conditional View: Agent List or Agent Detail */}
      {selectedAgentId ? (
        <div>
          {memoizedAgentDetail}
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight text-primary">
            Active Accounts
          </h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="flex items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-lg text-muted-foreground">Loading dashboard data...</span>
              </div>
            </div>
          ) : (
            <div>
              {memoizedPerformanceOverview}
            </div>
          )}
        </div>
      )}
      <DashboardModals 
        modalState={modalState}
        setModalState={setModalState}
        agents={agents}
        setAgents={setAgents}
        refreshAgents={fetchAgents}
      />
    </DashboardShell>
  );
}