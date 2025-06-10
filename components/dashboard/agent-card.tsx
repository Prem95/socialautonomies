'use client'; // Ensure this is present

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useCallback, useEffect } from 'react'; // Import useState, useCallback, useEffect
import { type Agent } from "@/app/dashboard/agents/types"; // Updated import path
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, PlusCircle, RefreshCw, AlertCircle, Bot, Play, Pause, Loader2, Trash2, Pencil, ExternalLink, Send, Calendar, Clock, X, Unplug, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AgentCardProps {
  agent: Agent;
  actionLoading: string | null;
  profile: any; // Pass profile for usage checks if needed, or specific limits
  handleStartAgent: (agentId: string) => void;
  handleStopAgent: (agentId: string) => void;
  handleDeleteAgent: (agentId: string) => void;
  handleDisconnectX: (agentId: string) => void;
  openTweetModal: (agentId: string) => void;
  openAutoTweetModal: (agent: Agent) => void;
  openAutoEngageModal: (agent: Agent) => void;
  disableAutoTweet: (agentId: string) => void;

  getStatusBadge: (status: string) => JSX.Element; // Pass utility functions or redefine here
  setActionLoading: (loadingState: string | null) => void;
  openEditModal: (agent: Agent) => void; // Update to match implementation
}

export function AgentCard({
  agent,
  actionLoading,
  profile,
  handleStartAgent,
  handleStopAgent,
  handleDeleteAgent,
  handleDisconnectX,
  openTweetModal,
  openAutoTweetModal,
  openAutoEngageModal,
  disableAutoTweet,

  getStatusBadge,
  setActionLoading,
  openEditModal, // Destructure the new prop
}: AgentCardProps) {

  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const LOCAL_STORAGE_AGENT_START_TIMES_KEY = 'agentStartTimes';

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const getAgentStartTimes = (): { [agentId: string]: number } => {
      try {
        const storedTimes = localStorage.getItem(LOCAL_STORAGE_AGENT_START_TIMES_KEY);
        return storedTimes ? JSON.parse(storedTimes) : {};
      } catch (error) {
        console.warn("Could not access localStorage for agent start times:", error);
        return {};
      }
    };

    const updateAgentStartTimeInStorage = (agentIdToUpdate: string, startTime: number | null) => {
      try {
        const currentTimes = getAgentStartTimes();
        if (startTime === null) {
          delete currentTimes[agentIdToUpdate];
        } else {
          currentTimes[agentIdToUpdate] = startTime;
        }
        if (Object.keys(currentTimes).length === 0) {
          localStorage.removeItem(LOCAL_STORAGE_AGENT_START_TIMES_KEY);
        } else {
          localStorage.setItem(LOCAL_STORAGE_AGENT_START_TIMES_KEY, JSON.stringify(currentTimes));
        }
      } catch (error) {
        console.warn("Could not update localStorage for agent start times:", error);
      }
    };

    if (agent.status === 'running') {
      const agentStartTimes = getAgentStartTimes();
      let currentAgentStartTime = agentStartTimes[agent.agentId];

      if (!currentAgentStartTime) {
        currentAgentStartTime = Date.now();
        updateAgentStartTimeInStorage(agent.agentId, currentAgentStartTime);
      }

      const calculateAndUpdateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - (currentAgentStartTime as number)) / 1000);
        setElapsedTime(elapsed >= 0 ? elapsed : 0);
      };

      calculateAndUpdateTimer(); // Initial update
      intervalId = setInterval(calculateAndUpdateTimer, 1000);

    } else {
      setElapsedTime(null);
      const agentStartTimes = getAgentStartTimes();
      if (agentStartTimes[agent.agentId]) {
        updateAgentStartTimeInStorage(agent.agentId, null);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [agent.status, agent.agentId]);

  const formatTime = (totalSeconds: number | null): string => {
    if (totalSeconds === null || totalSeconds < 0) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Derive loading states specific to this card
  const isDeploying = actionLoading === agent.agentId && agent.status !== 'running' && agent.isTwitterConnected;
  const isConnecting = actionLoading === agent.agentId && !agent.isTwitterConnected;
  const isStopping = actionLoading === agent.agentId && agent.status === 'running';
  const isDisconnecting = actionLoading === `disconnect_${agent.agentId}`;
  const isAutoTweetLoading = actionLoading === `${agent.agentId}_auto`;
  const isAutoEngageLoading = actionLoading === `${agent.agentId}_engage`;
  const isDeleting = actionLoading === `delete_${agent.agentId}`; // Make delete specific
  const isAnyActionLoading = isDeploying || isStopping || isConnecting || isAutoTweetLoading || isAutoEngageLoading || isDeleting || isDisconnecting; // Remove isRefreshing
  const isEditing = actionLoading === `update_${agent.agentId}`; // Add editing loading state check

  const buttonBaseClasses = "w-full h-full flex items-center justify-center text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1.5 disabled:opacity-60 transition-colors duration-200 min-w-0";
  const iconButtonBaseClasses = "h-9 w-9 disabled:opacity-60 rounded-lg transition-colors duration-200";

  // Status Visuals Helper
  const getStatusInfo = () => {
    if (!agent.isTwitterConnected) {
      return { text: "X Not Connected", color: "bg-gray-400", borderColor: "border-gray-300 dark:border-slate-700" };
    }
    switch (agent.status) {
      case 'running':
        return { text: "Running", color: "bg-green-500", borderColor: "border-green-500" };
      case 'error':
        return { text: "Error", color: "bg-red-500", borderColor: "border-red-500" };
      case 'pending':
        return { text: "Pending", color: "bg-yellow-500", borderColor: "border-yellow-500" };
      case 'connecting':
        return { text: "Connecting...", color: "bg-blue-500 animate-pulse", borderColor: "border-blue-500" };
      default:
        return { text: "Stopped", color: "bg-slate-500", borderColor: "border-slate-500" };
    }
  };
  const statusInfo = getStatusInfo();

  const iconButtonClasses = "h-9 w-9 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none";

  return (
    <Card
      className={`flex flex-col h-full overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 border-l-4 ${statusInfo.borderColor}`}
    >
      {/* HEADER */}
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${statusInfo.color}`}></div>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate" title={agent.name}>
              {agent.name}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" disabled={isAnyActionLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/agents/edit/${agent.agentId}`} className="flex items-center">
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDisconnectX(agent.agentId)} disabled={!agent.isTwitterConnected || isAnyActionLoading}>
                <Unplug className="mr-2 h-4 w-4" /> Disconnect X
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteAgent(agent.agentId)} 
                disabled={agent.status === 'running' || isAnyActionLoading} 
                className="text-red-600 focus:text-red-600 dark:focus:text-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{statusInfo.text}</p>
      </CardHeader>

      {/* CONTENT & STATS */}
      <CardContent className="p-4 sm:p-5 flex-grow">
        <AnimatePresence>
          {agent.status === 'running' && elapsedTime !== null && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2"
            >
              <Clock className="h-4 w-4 mr-2.5 text-slate-500" />
              <span className="font-medium">Runtime:</span>
              <span className="ml-auto font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
      </CardContent>

      {/* FOOTER ACTIONS */}
      <CardFooter className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80">
        <div className="w-full space-y-3">
          {/* Primary Action Button */}
          <div className="h-10">
            {!agent.isTwitterConnected ? (
              <Button onClick={() => handleStartAgent(agent.agentId)} disabled={isAnyActionLoading} className="w-full font-semibold">
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Connect X
              </Button>
            ) : agent.status === 'running' ? (
              <Button variant="destructive" onClick={() => handleStopAgent(agent.agentId)} disabled={isAnyActionLoading} className="w-full font-semibold">
                {isStopping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />} Stop Agent
              </Button>
            ) : (
              <Button onClick={() => handleStartAgent(agent.agentId)} disabled={isAnyActionLoading} className="w-full font-semibold bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
                {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Deploy Agent
              </Button>
            )}
          </div>
          
          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-1 gap-2 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openTweetModal(agent.agentId)} 
                    disabled={agent.status !== 'running' || isAnyActionLoading} 
                    className="h-8 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Send className="mr-1.5 h-3 w-3" />
                    Post Tweet
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Post Tweet Now</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openAutoTweetModal(agent)} 
                    disabled={agent.status !== 'running' || isAnyActionLoading} 
                    className={`h-8 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      agent.autoTweetEnabled 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-400' 
                        : ''
                    }`}
                  >
                    <Bot className="mr-1.5 h-3 w-3" />
                    Auto-Tweet
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {agent.autoTweetEnabled ? <p>Auto-Tweet is ON</p> : <p>Configure Auto-Tweet</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openAutoEngageModal(agent)} 
                    disabled={agent.status !== 'running' || isAnyActionLoading} 
                    className={`h-8 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      agent.autoEngageEnabled 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-400' 
                        : ''
                    }`}
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Auto-Engage
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {agent.autoEngageEnabled ? <p>Auto-Engage is ON</p> : <p>Configure Auto-Engage</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 