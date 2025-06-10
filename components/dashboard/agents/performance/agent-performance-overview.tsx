"use client";

import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  ArrowUpRight, 
  Users, 
  BarChart3, 
  Pencil, 
  MapPin, 
  Globe, 
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface AgentPerformanceOverviewProps {
  onAgentSelect: (agentId: string) => void;
  refreshTrigger?: number;
  openEditModal?: (agent: any) => void;
  agents?: any[];
  dashboardData?: {
    stats?: any;
    usage?: any;
    tweets?: any;
  };
}

interface AgentData {
  agentId: string;
  name: string;
  status: string;
  startTime?: string;
  twitterUsername?: string;
  profile?: {
    id: string;
    username: string;
    name: string;
    profileImageUrl: string;
    description: string;
    location: string;
    website: string;
    joinDate: string;
    verified: boolean;
    tweetsCount: number;
    followersCount: number;
    followingCount: number;
    likesCount: number;
  };
  stats?: {
    tweets: number;
    engagement: string;
    followers: number;
    following: number;
    likesCount: number;
    engagementRate: number;
  };
}

// Helper functions moved outside component for better performance
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const calculateUptime = (startTime?: string): string => {
  if (!startTime) return "Unknown";
  try {
    return formatDistanceToNow(new Date(startTime), { addSuffix: false });
  } catch {
    return "Unknown";
  }
};

const calculateEngagement = (likesCount: number, tweetsCount: number): string => {
  if (tweetsCount === 0) return "0%";
  const rate = (likesCount / tweetsCount) * 100;
  return `${rate.toFixed(1)}%`;
};

const calculateEngagementRate = (likesCount: number, tweetsCount: number): number => {
  if (tweetsCount === 0) return 0;
  return (likesCount / tweetsCount) * 100;
};

const AgentPerformanceOverviewComponent = memo(function AgentPerformanceOverview({ 
  onAgentSelect, 
  refreshTrigger = 0,
  openEditModal,
  agents: propAgents,
  dashboardData
}: AgentPerformanceOverviewProps) {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      
      let agentsData = [];
      // Always use dashboard data if available to avoid redundant API calls
      if (dashboardData?.agents && dashboardData.agents.length > 0) {
        agentsData = dashboardData.agents;
      } else if (propAgents && propAgents.length > 0) {
        agentsData = propAgents;
      } else {
        // Fallback to direct API call only if no data is provided
        const response = await axios.get('/api/agents/status', {
          timeout: 15000
        });
        agentsData = response.data.agents || [];
      }
      
      const runningAgents = agentsData.filter((agent: AgentData) => agent.status === 'running');
      
      const agentsWithEmptyStats = runningAgents.map((agent: AgentData) => ({
        ...agent,
        stats: {
          tweets: 0,
          engagement: "0%",
          followers: 0,
          following: 0,
          likesCount: 0,
          engagementRate: 0
        }
      }));
      
      setAgents(agentsWithEmptyStats);
      
      let agentsWithStats = agentsWithEmptyStats;
      
      if (runningAgents.length > 0) {
        try {
          const authResponse = await axios.get('/api/agents/me', {
            timeout: 15000
          });
          
          if (authResponse.data.success && authResponse.data.profile) {
            const profile = authResponse.data.profile;
            
            agentsWithStats = runningAgents.map((agent: AgentData) => {
              const engagementRate = calculateEngagementRate(profile.likesCount || 0, profile.tweetsCount || 0);
              return {
                ...agent,
                twitterUsername: profile.username,
                profile: {
                  id: profile.id,
                  username: profile.username,
                  name: profile.name,
                  profileImageUrl: profile.profileImageUrl,
                  description: profile.description || '',
                  location: profile.location || '',
                  website: profile.website || '',
                  joinDate: profile.joinDate,
                  verified: profile.verified || false,
                  tweetsCount: profile.tweetsCount || 0,
                  followersCount: profile.followersCount || 0,
                  followingCount: profile.followingCount || 0,
                  likesCount: profile.likesCount || 0
                },
                stats: {
                  tweets: profile.tweetsCount || 0,
                  engagement: calculateEngagement(profile.likesCount || 0, profile.tweetsCount || 0),
                  followers: profile.followersCount || 0,
                  following: profile.followingCount || 0,
                  likesCount: profile.likesCount || 0,
                  engagementRate
                }
              };
            });
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.data?.error) {
            const errorType = error.response.data.error;
            if (errorType !== 'NO_AGENTS_WITH_AUTH' && errorType !== 'NO_VALID_AUTH') {
              console.error('Error fetching X profile for agents:', error);
            }
          } else {
            console.error('Error fetching X profile for agents:', error);
          }
          agentsWithStats = agentsWithEmptyStats;
        }
      }
      
      setAgents(agentsWithStats);
    } catch (error) {
      console.error('Error fetching agents:', error);
      
      // Don't show error toast for expected scenarios (404s for new users)
      const is404Error = axios.isAxiosError(error) && error.response?.status === 404;
      const isEmptyAgentsError = axios.isAxiosError(error) && 
        (error.response?.data?.error === 'NO_AGENTS_WITH_AUTH' || 
         error.response?.data?.error === 'NO_VALID_AUTH' ||
         error.response?.data?.error === 'Profile not found');
      
      if (!is404Error && !isEmptyAgentsError) {
        toast({
          title: "Error",
          description: "Failed to fetch active agents",
          variant: "destructive",
        });
      }
      
      // Set empty agents array for graceful handling
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [refreshTrigger, propAgents, dashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2 border-border bg-card">
        <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Active Agents</h3>
        <p className="text-muted-foreground mb-4">Deploy or create an agent to see performance metrics here</p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/dashboard/agents">Deploy Your First Agent</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <Card 
          key={agent.agentId} 
          className="bg-card border shadow-sm rounded-xl overflow-hidden flex flex-col"
        >
          {/* Header Section */}
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-offset-card ring-primary/50">
                  <AvatarImage 
                    src={agent.profile?.profileImageUrl} 
                    alt={agent.profile?.name || agent.name}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {(agent.profile?.name || agent.name).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">
                      {agent.profile?.name || agent.name}
                    </h3>
                    {agent.profile?.verified && (
                      <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    @{agent.profile?.username || agent.twitterUsername || 'Not connected'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 font-medium">
                  <Activity className="h-3 w-3 mr-1.5" />
                  Active
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditModal?.(agent)}
                  className="h-8 w-8 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 flex-grow flex flex-col">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <MessageSquare className="h-5 w-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(agent.stats?.tweets || 0)}
                </div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tweets</div>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(agent.stats?.followers || 0)}
                </div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Followers</div>
              </div>
            </div>

            <Separator/>
            
            {/* Agent Details */}
            <div className="space-y-2 text-sm text-gray-600 flex-grow">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>Uptime: {calculateUptime(agent.startTime)}</span>
              </div>
              
              {agent.profile?.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="truncate">Location: {agent.profile.location}</span>
                </div>
              )}
              
              {agent.profile?.website && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-gray-400"/> 
                  <span className="truncate text-blue-600 hover:underline">
                    <a href={agent.profile.website} target="_blank" rel="noopener noreferrer">
                      {agent.profile.website.replace(/^(https?:\/\/)?(www\.)?/, '')}
                    </a>
                  </span>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-2">
              <Button 
                onClick={() => onAgentSelect(agent.agentId)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Full Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

export { AgentPerformanceOverviewComponent as AgentPerformanceOverview };