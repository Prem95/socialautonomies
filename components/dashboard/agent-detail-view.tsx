"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentTweetActivity } from "@/components/dashboard/agents/performance/agent-tweet-activity";
import { AutoEngageAnalytics } from "@/components/dashboard/agents/analytics/auto-engage-analytics";
import { ArrowLeft, RefreshCw, Users, MessageCircle, Activity, Twitter, TrendingUp } from "lucide-react";
import { useDashboardState } from "@/app/dashboard/hooks/use-dashboard-state";

interface AgentDetailViewProps {
  agentId: string;
  refreshTrigger: number;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AgentDetailView({
  agentId,
  refreshTrigger,
  onBack,
  onRefresh,
  isRefreshing
}: AgentDetailViewProps) {
  const [activeTab, setActiveTab] = useState("tweets");
  const { agentMetrics } = useDashboardState({ 
    toast: () => {}, // Empty toast function as we don't need it here
    setIsLoading: () => {} // Empty loading setter as we don't need it here
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> 
            Back to Agents
          </Button>
          <div className="h-6 w-px bg-gray-200" />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Agent Metrics Cards */}
      {agentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tweets Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Total Tweets</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Twitter className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{agentMetrics.tweets}</div>
              <p className="text-xs text-gray-600 mt-1">Generated content</p>
            </CardContent>
          </Card>
          
          {/* Followers Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Followers</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{agentMetrics.followers}</div>
              <p className="text-xs text-gray-600 mt-1">Audience reach</p>
            </CardContent>
          </Card>
          
          {/* Following Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Following</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{agentMetrics.following}</div>
              <p className="text-xs text-gray-600 mt-1">Network size</p>
            </CardContent>
          </Card>
          
          {/* Engagement Card */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Engagement Rate</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{agentMetrics.engagement}</div>
              <p className="text-xs text-gray-600 mt-1">Interaction quality</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-100 px-6 pt-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100/60">
              <TabsTrigger 
                value="tweets" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Tweet Activity
              </TabsTrigger>
              <TabsTrigger 
                value="auto-engage"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Activity className="h-4 w-4" />
                Auto-Engage
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tweet Activity Content */}
          <TabsContent value="tweets" className="mt-0 border-0 p-6">
            <AgentTweetActivity agentId={agentId} key={`activity-${agentId}-${refreshTrigger}`} />
          </TabsContent>

          {/* Auto-Engage Activity Content */}
          <TabsContent value="auto-engage" className="mt-0 border-0 p-6">
            <AutoEngageAnalytics 
              agentId={agentId} 
              key={`auto-engage-${agentId}-${refreshTrigger}`}
              className="w-full"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 