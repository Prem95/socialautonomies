"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Play, 
  Pause, 
  Loader2 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface Agent {
  agentId: string;
  name: string;
  goal: string;
  status: string;
  language: string;
  startTime?: Date | null;
  endTime?: Date | null;
}

export function ActiveAgentsCard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    fetchProfile();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/agents");
      setAgents(response.data);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get("/api/profile", { 
        withCredentials: true 
      });
      setProfile(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Handle authentication errors here
        console.log("Authentication error when fetching profile");
      }
    }
  };

  const handleStartAgent = async (agentId: string) => {
    try {
      setActionLoading(agentId);
      await axios.post(`/api/agents/${agentId}/deploy`);
      
      toast({
        title: "Agent started",
        description: "The agent has been deployed successfully",
      });
      
      // Refresh the agent list
      fetchAgents();
    } catch (error) {
      console.error("Error starting agent:", error);

      // Check if it's an Axios error and specifically an authentication failure (401)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const apiErrorMessage = error.response?.data?.error || "Please check credentials or refresh cookies.";
        toast({
          title: "X Authentication Failed",
          description: `Could not start agent. ${apiErrorMessage}`,
          variant: "destructive",
        });
      } else {
        // Generic error for other issues
        toast({
          title: "Failed to start agent",
          description: error instanceof Error ? error.message : "An unexpected error occurred while deploying.",
          variant: "destructive",
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      setActionLoading(agentId);
      await axios.post(`/api/agents/${agentId}/stop`);
      
      toast({
        title: "Agent stopped",
        description: "The agent has been stopped successfully",
      });
      
      // Refresh the agent list
      fetchAgents();
    } catch (error) {
      console.error("Error stopping agent:", error);
      toast({
        title: "Failed to stop agent",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      return;
    }
    
    try {
      setActionLoading(agentId);
      await axios.delete(`/api/agents/${agentId}`);
      
      toast({
        title: "Agent deleted",
        description: "The agent has been permanently deleted",
      });
      
      // Remove agent from state
      setAgents(agents.filter(agent => agent.agentId !== agentId));
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Failed to delete agent",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="success">Active</Badge>;
      case "stopped":
        return <Badge variant="secondary">Stopped</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRuntime = (agent: Agent) => {
    if (agent.status === "running" && agent.startTime) {
      return formatDistanceToNow(new Date(agent.startTime), { addSuffix: true });
    }
    if (agent.endTime && agent.startTime) {
      const start = new Date(agent.startTime);
      const end = new Date(agent.endTime);
      const runtimeMs = end.getTime() - start.getTime();
      const hours = Math.floor(runtimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((runtimeMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    }
    return "Not started";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Agents</CardTitle>
          {profile?.usage && (
            <div className="text-sm flex items-center gap-2">
              <div className="text-muted-foreground">
                {profile.usage.agents.current} of {profile.usage.agents.max} agents used
              </div>
              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ width: `${profile.usage.agents.percentage}%` }}
                />
              </div>
              {profile.usage.agents.available <= 0 && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No agents created yet</p>
            <Link href="/dashboard/agents/new">
              <Button>Create Your First Agent</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.agentId}>
                    <TableCell>
                      <Link 
                        href={`/dashboard/agents/${agent.agentId}`}
                        className="font-medium hover:underline"
                      >
                        {agent.name}
                      </Link>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {agent.goal}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>{agent.language}</TableCell>
                    <TableCell>{getRuntime(agent)}</TableCell>
                    <TableCell className="text-right">
                      {actionLoading === agent.agentId ? (
                        <Button variant="ghost" size="icon" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => agent.status === "running" 
                                ? handleStopAgent(agent.agentId) 
                                : handleStartAgent(agent.agentId)
                              }
                            >
                              {agent.status === "running" ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Stop Agent
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Start Agent
                                </>
                              )}
                            </DropdownMenuItem>
                            <Link href={`/dashboard/agents/edit/${agent.agentId}`}>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAgent(agent.agentId)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}