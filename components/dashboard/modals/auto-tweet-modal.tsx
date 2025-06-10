"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Loader2, 
  Bot,
  Clock,
  MessageCircle,
  Activity,
  Zap,
  PenTool,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModalProps } from "./modal-types";

interface AutoTweetRealConfig {
  enabled: boolean;
  frequencyHours: number;
  count: number;
  lastRunTime: string | null;
}

export function AutoTweetModal({ modalState, setModalState, refreshAgents, agents }: ModalProps) {
  const { toast } = useToast();

  const [realConfig, setRealConfig] = useState<AutoTweetRealConfig | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const currentAgentId = modalState.autoTweet.agentId;
  const agentDetails = agents?.find(a => a.agentId === currentAgentId);

  useEffect(() => {
    if (modalState.autoTweet.isOpen && agentDetails) {
      setIsLoadingConfig(true);
      const initialConfig: AutoTweetRealConfig = {
        enabled: agentDetails.autoTweetEnabled || false,
        frequencyHours: agentDetails.autoTweetFrequencyHours || modalState.autoTweet.frequency || 4,
        count: agentDetails.autoTweetCount || modalState.autoTweet.count || 1,
        lastRunTime: null,
      };
      setRealConfig(initialConfig);

      setModalState({
        ...modalState,
        autoTweet: {
          ...modalState.autoTweet,
          frequency: initialConfig.frequencyHours,
          count: initialConfig.count,
        }
      });

      if (initialConfig.enabled && initialConfig.frequencyHours) {
        const now = new Date();
        const intervalMs = initialConfig.frequencyHours * 60 * 60 * 1000;
        let nextRun;
        if (initialConfig.lastRunTime) {
          const lastRun = new Date(initialConfig.lastRunTime);
          nextRun = new Date(lastRun.getTime() + intervalMs);
        } else {
          nextRun = new Date(now.getTime() + intervalMs);
        }
        setNextRunTime(nextRun);
        setCountdown(Math.max(0, nextRun.getTime() - now.getTime()));
      } else {
        setNextRunTime(null);
        setCountdown(0);
      }
      setIsLoadingConfig(false);
    } else if (!modalState.autoTweet.isOpen) {
      setRealConfig(null);
      setNextRunTime(null);
      setCountdown(0);
    }
  }, [modalState.autoTweet.isOpen, agentDetails]);

  useEffect(() => {
    if (!nextRunTime || !modalState.autoTweet.isOpen || !realConfig?.enabled) {
      if (realConfig && !realConfig.enabled) setCountdown(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const msUntilNext = Math.max(0, nextRunTime.getTime() - now.getTime());
      setCountdown(msUntilNext);
      if (msUntilNext <= 0) {
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRunTime, realConfig?.enabled, modalState.autoTweet.isOpen]);

  const formatCountdown = (ms: number) => {
    if (!realConfig?.enabled || ms <= 0) return realConfig?.enabled ? "Scheduled" : "Inactive";
    
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    
    if (hours > 0) {
      return `${hours}h ${String(min).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    } else if (min > 0) {
      return `${String(min).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    } else {
      return `${String(sec).padStart(2, '0')}s`;
    }
  };

  const closeAutoTweetModal = () => {
    setModalState({
      ...modalState,
      autoTweet: {
        ...modalState.autoTweet,
        isOpen: false,
        agentId: null
      }
    });
  };

  const handleAutoTweetFrequencyChange = (value: string) => {
    const frequency = parseInt(value, 10);
    
    if (!isNaN(frequency)) {
      setModalState({
        ...modalState,
        autoTweet: {
          ...modalState.autoTweet,
          frequency
        }
      });
    }
  };

  const handleAutoTweetCountChange = (value: number[]) => {
    if (value && value.length > 0) {
      setModalState({
        ...modalState,
        autoTweet: {
          ...modalState.autoTweet,
          count: value[0]
        }
      });
    }
  };

  const saveAutoTweetConfig = async (enableFeature: boolean) => {
    const { autoTweet } = modalState;
    
    if (!autoTweet.agentId) return;

    const currentActionLoadingId = `${autoTweet.agentId}_auto_config`;
    setModalState({
      ...modalState,
      actionLoading: currentActionLoadingId
    });
    
    const payload = {
      autoTweetEnabled: enableFeature,
      autoTweetFrequencyHours: autoTweet.frequency,
      autoTweetCount: autoTweet.count,
    };

    try {
      await axios.put(`/api/agents/${autoTweet.agentId}`, payload);
      
      toast({
        title: enableFeature ? "Auto-Tweet Enabled" : "Auto-Tweet Disabled",
        description: enableFeature 
          ? `Agent will now post ${autoTweet.count} tweet(s) every ${autoTweet.frequency} hours.`
          : "Auto-Tweet has been disabled for this agent.",
      });
      
      const newRealConfig: AutoTweetRealConfig = {
        enabled: enableFeature,
        frequencyHours: autoTweet.frequency,
        count: autoTweet.count,
        lastRunTime: realConfig?.lastRunTime || null,
      };

      if (enableFeature && newRealConfig.frequencyHours) {
        const now = new Date();
        const intervalMs = newRealConfig.frequencyHours * 60 * 60 * 1000;
        let nextRunCalc;

        if (newRealConfig.lastRunTime && 
            realConfig?.enabled && 
            realConfig.frequencyHours === newRealConfig.frequencyHours) {
             const lastRun = new Date(newRealConfig.lastRunTime);
             nextRunCalc = new Date(lastRun.getTime() + intervalMs);
        } else {
             nextRunCalc = new Date(now.getTime() + intervalMs); 
        }
        
        setNextRunTime(nextRunCalc);
        setCountdown(Math.max(0, nextRunCalc.getTime() - now.getTime()));

      } else {
        setNextRunTime(null);
        setCountdown(0);
      }
      setRealConfig(newRealConfig);

      await refreshAgents();

    } catch (error) {
      console.error("Error saving auto-tweet config:", error);
      
      let errorMessage = "An unexpected error occurred while saving.";
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || "Failed to communicate with the server.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to Save Config",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setModalState({
        ...modalState,
        actionLoading: null
      });
    }
  };

  return (
    <Dialog 
      open={modalState.autoTweet.isOpen} 
      onOpenChange={closeAutoTweetModal}
    >
      <AnimatePresence>
        {modalState.autoTweet.isOpen && (
          <DialogContent 
            className="sm:max-w-4xl p-4 max-h-[90vh] overflow-y-auto"
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-3">
                <DialogTitle className="flex items-center text-lg">
                  <Bot className="h-5 w-5 text-[hsl(var(--primary))] mr-2" />
                  Auto-Tweet Settings
                  {realConfig && (
                    <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      realConfig.enabled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' 
                        : 'bg-[hsl(var(--venetian-lace))] text-[hsl(var(--fence-green))] dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {realConfig.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {isLoadingConfig ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                  <span className="text-muted-foreground">Loading configuration...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-brown-50 to-indigo-50 dark:from-brown-950/30 dark:to-indigo-950/30 p-5 rounded-lg border border-brown-200 dark:border-brown-800/50">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-3">
                        <Zap className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                      </div>
                      <h3 className="text-lg font-bold text-brown-900 dark:text-brown-100">How Auto-Tweet Works</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <PenTool className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Content Generation
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Creates original tweets based on your agent's personality and goals.
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <Calendar className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Scheduled Posting
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Posts tweets automatically at your chosen frequency and volume.
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <Activity className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Consistent Presence
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Maintains regular activity to grow your audience and engagement.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[hsl(var(--primary))]" />
                        <Label htmlFor="frequency" className="text-lg font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Post Frequency</Label>
                      </div>
                      <Select 
                        value={modalState.autoTweet.frequency.toString()} 
                        onValueChange={handleAutoTweetFrequencyChange}
                        disabled={modalState.actionLoading === `${currentAgentId}_auto_config`}
                      >
                        <SelectTrigger className="w-full h-10 text-sm font-medium border border-[hsl(var(--macadamia-beige))] dark:border-gray-700 rounded-lg hover:border-[hsl(var(--primary))] dark:hover:border-[hsl(var(--primary))] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 border-[hsl(var(--macadamia-beige))] bg-white dark:bg-gray-800">
                          {[1, 2, 3, 4, 6, 8, 12, 24, 48, 72].map(hours => (
                            <SelectItem key={hours} value={hours.toString()} className="text-base py-3 rounded-lg hover:bg-[hsl(var(--venetian-lace))] dark:hover:bg-gray-700">
                              Every {hours === 1 ? "hour" : `${hours} hours`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often to automatically post new tweets
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-5 w-5 text-[hsl(var(--primary))]" />
                        <Label htmlFor="count" className="text-base font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Tweets per Interval</Label>
                        <span className="text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--venetian-lace))] dark:bg-[hsl(var(--primary))]/20 px-2 py-1 rounded border ml-auto">
                          {modalState.autoTweet.count}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          id="count"
                          min={1}
                          max={5}
                          step={1}
                          value={[modalState.autoTweet.count]}
                          onValueChange={handleAutoTweetCountChange}
                          disabled={modalState.actionLoading === `${currentAgentId}_auto_config`}
                          className="w-full [&>span:first-child]:h-3 [&>span:first-child]:bg-[hsl(var(--macadamia-beige))] dark:[&>span:first-child]:bg-gray-700 [&>span:first-child>span]:h-3 [&>span:first-child>span]:bg-[hsl(var(--primary))] [&>span:first-child>span]:w-6 [&>span:first-child>span]:h-6 [&>span:first-child>span]:border-2 [&>span:first-child>span]:border-white [&>span:first-child>span]:shadow-lg [&>span:first-child>span]:hover:scale-110 [&>span:first-child>span]:transition-transform"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Number of tweets to post each time
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between items-center pt-4 mt-4 border-t border-[hsl(var(--macadamia-beige))]/70 dark:border-gray-700/70">
                <Button
                  variant="outline"
                  onClick={closeAutoTweetModal}
                  disabled={modalState.actionLoading === `${currentAgentId}_auto_config`}
                  className="mr-auto h-10 px-4 text-sm font-medium border border-[hsl(var(--macadamia-beige))] hover:border-[hsl(var(--primary))] rounded-lg hover:bg-[hsl(var(--venetian-lace))] dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </Button>
                
                <div className="flex gap-3">
                  {realConfig?.enabled ? (
                    <Button 
                      variant="destructive"
                      onClick={() => saveAutoTweetConfig(false)}
                      disabled={modalState.actionLoading === `${currentAgentId}_auto_config` || isLoadingConfig}
                      className="h-10 px-6 text-sm font-semibold rounded-lg border border-red-500 hover:border-red-600 transition-all duration-200"
                    >
                      {modalState.actionLoading === `${currentAgentId}_auto_config` && realConfig.enabled && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      Turn Off
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => saveAutoTweetConfig(true)}
                      disabled={modalState.actionLoading === `${currentAgentId}_auto_config` || isLoadingConfig}
                      className="h-10 px-6 text-sm font-semibold rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--pumpkin-vapor))] hover:from-[hsl(var(--primary))]/90 hover:to-[hsl(var(--pumpkin-vapor))]/90 transition-all duration-200"
                    >
                      {modalState.actionLoading === `${currentAgentId}_auto_config` && !realConfig?.enabled && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      Turn On
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
} 