"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Settings,
  Clock,
  MessageCircle,
  Activity,
  Info,
  Eye,
  Zap,
  Shield,
  Target,
  ArrowUp,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModalProps } from "./modal-types";

interface AutoEngageConfig {
  enabled: boolean;
  frequencyHours: number | null;
  maxReplies: number | null;
  minScore: number | null;
  autoReply: boolean;
  lastRunTime: string | null;
  qualityFilter: boolean;
  strictnessLevel: number;
}

interface ReplyUsageStats {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

export function AutoEngageModal({ modalState, setModalState, refreshAgents }: ModalProps) {
  const { toast } = useToast();
  const [realConfig, setRealConfig] = useState<AutoEngageConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [replyUsage, setReplyUsage] = useState<ReplyUsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Helper function to get quality score from strictness level
  const getQualityScoreFromStrictness = (level: number): number => {
    if (level <= 1) return 2; // Less strict
    if (level <= 3) return 4; // Medium strict  
    return 6; // More strict (4-5)
  };

  // Helper function to get strictness description
  const getStrictnessDescription = (level: number): string => {
    if (level <= 1) return "Less Strict - Replies to most tweets (score ≥2)";
    if (level <= 3) return "Balanced - Replies to good tweets (score ≥4)";
    return "High Quality - Replies to excellent tweets only (score ≥6)";
  };

  // Fetch reply usage stats
  const fetchReplyUsage = async () => {
    if (!modalState.autoEngage?.agentId) return;
    
    setIsLoadingUsage(true);
    try {
      const response = await axios.get('/api/profile');
      if (response.data && response.data.plan) {
        const profile = response.data;
        setReplyUsage({
          used: profile.repliesUsed || 0,
          limit: profile.plan.maxRepliesPerAgent || 50,
          remaining: Math.max(0, (profile.plan.maxRepliesPerAgent || 50) - (profile.repliesUsed || 0)),
          percentage: profile.plan.maxRepliesPerAgent > 0 ? ((profile.repliesUsed || 0) / profile.plan.maxRepliesPerAgent) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching reply usage:', error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // Fetch real auto-engage configuration when modal opens
  useEffect(() => {
    const fetchAutoEngageConfig = async () => {
      if (!modalState.autoEngage?.isOpen || !modalState.autoEngage?.agentId) return;
      
      setIsLoadingConfig(true);
      try {
        const response = await axios.get(`/api/agents/${modalState.autoEngage.agentId}/auto-engage`);
        
        if (response.data.success) {
          const config = response.data.config;
          setRealConfig(config);
          
          // Update modal state to match the real configuration
          // If current frequency is below minimum (5 minutes), set to 5 minutes
          const safeFrequency = config.frequencyHours && config.frequencyHours < 0.0833 ? 0.0833 : (config.frequencyHours || 4);
          
          setModalState({
            ...modalState,
            autoEngage: {
              ...modalState.autoEngage,
              frequency: safeFrequency,
              maxReplies: config.maxReplies || 3,
              minScore: config.minScore || 15,
              autoReply: config.autoReply || false,
              qualityFilter: config.qualityFilter !== undefined ? config.qualityFilter : true,
              strictnessLevel: config.strictnessLevel !== undefined ? config.strictnessLevel : 2
            }
          });
          
          console.log('[Auto-Engage Modal] Config loaded:', {
            enabled: config.enabled,
            frequencyHours: config.frequencyHours,
            qualityFilter: config.qualityFilter,
            strictnessLevel: config.strictnessLevel
          });
        }
      } catch (error) {
        console.error('Error fetching auto-engage config:', error);
        toast({
          title: "Failed to load configuration",
          description: "Could not fetch auto-engage settings",
          variant: "destructive",
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    if (modalState.autoEngage?.isOpen) {
      fetchAutoEngageConfig();
      fetchReplyUsage();
    }
  }, [modalState.autoEngage?.isOpen, modalState.autoEngage?.agentId]);

  const closeAutoEngageModal = () => {
    setModalState({
      ...modalState,
      autoEngage: {
        ...modalState.autoEngage,
        isOpen: false,
        agentId: null
      }
    });
    // Reset state
    setRealConfig(null);
  };

  const handleFrequencyChange = (value: string) => {
    const frequency = parseFloat(value); // Use parseFloat to handle 0.0167
    
    if (!isNaN(frequency)) {
      setModalState({
        ...modalState,
        autoEngage: {
          ...modalState.autoEngage,
          frequency
        }
      });
    }
  };

  const handleMaxRepliesChange = (value: number[]) => {
    if (value && value.length > 0) {
      setModalState({
        ...modalState,
        autoEngage: {
          ...modalState.autoEngage,
          maxReplies: value[0]
        }
      });
    }
  };

  const handleQualityFilterChange = (checked: boolean) => {
    setModalState({
      ...modalState,
      autoEngage: {
        ...modalState.autoEngage,
        qualityFilter: checked
      }
    });
  };

  const handleStrictnessChange = (value: number[]) => {
    if (value && value.length > 0) {
      setModalState({
        ...modalState,
        autoEngage: {
          ...modalState.autoEngage,
          strictnessLevel: value[0]
        }
      });
    }
  };

  const saveAutoEngageConfig = async (enableAction: boolean = true) => {
    const { autoEngage } = modalState;
    
    if (!autoEngage.agentId) return;

    // Set action loading state
    setModalState({
      ...modalState,
      actionLoading: `${autoEngage.agentId}_engage`
    });
    
    try {
      // Use the dedicated auto-engage endpoint instead of general agents endpoint
      await axios.put(`/api/agents/${autoEngage.agentId}/auto-engage`, {
        enabled: enableAction,
        frequencyHours: autoEngage.frequency,
        maxReplies: autoEngage.maxReplies,
        minScore: autoEngage.minScore || 15, // Include minScore with default value
        autoReply: autoEngage.autoReply || false,
        qualityFilter: autoEngage.qualityFilter !== undefined ? autoEngage.qualityFilter : true,
        strictnessLevel: autoEngage.strictnessLevel !== undefined ? autoEngage.strictnessLevel : 2
      });
      
      toast({
        title: enableAction ? "Auto-Engage Enabled! ✅" : "Auto-Engage Disabled",
        description: enableAction 
          ? `Agent will automatically post up to ${autoEngage.maxReplies} ${autoEngage.qualityFilter ? 'high-quality ' : ''}replies every ${
              autoEngage.frequency === 0.0833 ? '5 minutes' : 
              autoEngage.frequency === 0.25 ? '15 minutes' :
              autoEngage.frequency === 0.5 ? '30 minutes' :
              autoEngage.frequency === 1 ? 'hour' : `${autoEngage.frequency} hours`
            }. ${autoEngage.qualityFilter ? `Quality filtering is enabled with ${getStrictnessDescription(autoEngage.strictnessLevel || 2).split(' - ')[0]} strictness.` : ''}`
          : "Auto-engage has been disabled for this agent.",
      });
      
      // Refetch the auto-engage configuration to get the updated state
      const configResponse = await axios.get(`/api/agents/${autoEngage.agentId}/auto-engage`);
      if (configResponse.data.success) {
        const config = configResponse.data.config;
        setRealConfig(config);
        
        // Update modal state to reflect the saved configuration
        // If current frequency is below minimum (5 minutes), set to 5 minutes
        const safeFrequency = config.frequencyHours && config.frequencyHours < 0.0833 ? 0.0833 : (config.frequencyHours || 4);
        
        setModalState({
          ...modalState,
          autoEngage: {
            ...modalState.autoEngage,
            frequency: safeFrequency,
            maxReplies: config.maxReplies || 3,
            minScore: config.minScore || 15,
            autoReply: config.autoReply || false,
            qualityFilter: config.qualityFilter !== undefined ? config.qualityFilter : true,
            strictnessLevel: config.strictnessLevel !== undefined ? config.strictnessLevel : 2
          }
        });
        
        console.log('[Auto-Engage Modal] Config saved successfully');
      }
      
      await refreshAgents();
      // Don't close modal immediately - let user see the updated state
    } catch (error) {
      console.error("Error saving auto-engage config:", error);
      
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
      // Clear action loading state
      setModalState({
        ...modalState,
        actionLoading: null
      });
    }
  };

  const testAutoEngage = async () => {
    const { autoEngage } = modalState;
    
    if (!autoEngage.agentId) return;

    // Set test loading state
    setModalState({
      ...modalState,
      actionLoading: `${autoEngage.agentId}_test`
    });
    
    try {
      const response = await axios.post(`/api/agents/${autoEngage.agentId}/replies`, {
        action: "trigger_cycle"
      });
      
      if (response.data.success && response.data.results) {
        const { results } = response.data;
        toast({
          title: "Auto-Engage Test Completed! 🤖",
          description: `Found ${results.tweetsFetched || 0} tweets, generated ${results.repliesGenerated || 0} replies, posted ${results.repliesPosted || 0} successfully.`,
        });
      } else {
        toast({
          title: "Auto-Engage Test Failed",
          description: response.data.error || "No results returned from test cycle.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing auto-engage:", error);
      
      let errorMessage = "An unexpected error occurred during testing.";
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || "Failed to communicate with the server.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Auto-Engage Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Clear test loading state
      setModalState({
        ...modalState,
        actionLoading: null
      });
    }
  };

  return (
    <Dialog 
      open={modalState.autoEngage?.isOpen || false} 
      onOpenChange={closeAutoEngageModal}
    >
      <AnimatePresence>
        {modalState.autoEngage?.isOpen && (
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
                  <Settings className="h-5 w-5 text-[hsl(var(--primary))] mr-2" />
                  Auto-Engage Settings
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
                  {/* How it works section */}
                  <div className="bg-gradient-to-r from-brown-50 to-indigo-50 dark:from-brown-950/30 dark:to-indigo-950/30 p-5 rounded-lg border border-brown-200 dark:border-brown-800/50">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-3">
                        <Zap className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                      </div>
                      <h3 className="text-lg font-bold text-brown-900 dark:text-brown-100">How Auto-Engage Works</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <Eye className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Monitors Timeline
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Watches your X timeline for engaging tweets and trends.
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <MessageCircle className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Generates Replies
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Creates organic replies based on your agent's personality and tweet content.
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-brown-100 dark:bg-brown-900/50 rounded-full mb-2">
                          <Clock className="h-5 w-5 text-brown-600 dark:text-brown-400" />
                        </div>
                        <h4 className="text-base font-semibold text-brown-900 dark:text-brown-100">
                          Engages Automatically
                        </h4>
                        <p className="text-sm text-brown-700 dark:text-brown-200 leading-relaxed px-2">
                          Replies are posted at your chosen frequency.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Reply Usage */}
                  {replyUsage && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <Label className="text-base font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Monthly Reply Usage</Label>
                        </div>
                        <span className="text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--venetian-lace))] dark:bg-[hsl(var(--primary))]/20 px-2 py-1 rounded border">
                          {replyUsage.used} / {replyUsage.limit}
                        </span>
                      </div>
                      
                      <Progress 
                        value={Math.min(replyUsage.percentage, 100)}
                        className={`h-3 mb-2 ${
                          replyUsage.percentage >= 100 
                            ? '[&>div]:bg-red-500' 
                            : replyUsage.percentage >= 80
                            ? '[&>div]:bg-amber-500'
                            : '[&>div]:bg-[hsl(var(--primary))]'
                        }`}
                      />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {replyUsage.remaining > 0 
                            ? `${replyUsage.remaining} replies remaining this month`
                            : "You've reached your monthly limit"
                          }
                        </span>
                        <span className="font-medium text-[hsl(var(--fence-green))] dark:text-gray-100">
                          {Math.round(replyUsage.percentage)}%
                        </span>
                      </div>
                      
                      {/* Upselling prompt when usage is high or limit reached */}
                      {replyUsage.percentage >= 80 && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                                {replyUsage.percentage >= 100 ? "Reply Limit Reached!" : "Running Low on Replies"}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-200 mb-3">
                                {replyUsage.percentage >= 100 
                                  ? "Upgrade to Expert plan for 200 replies/month and never hit limits again."
                                  : "Upgrade for more replies/month to avoid interruptions."
                                }
                              </p>
                              <Button 
                                size="sm" 
                                className="h-7 px-3 text-xs bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--pumpkin-vapor))] hover:from-[hsl(var(--primary))]/90 hover:to-[hsl(var(--pumpkin-vapor))]/90"
                                onClick={() => {
                                  window.open('/pricing', '_blank');
                                }}
                              >
                                <ArrowUp className="h-3 w-3 mr-1" />
                                Upgrade Plan
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Frequency Setting */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[hsl(var(--primary))]" />
                        <Label htmlFor="frequency" className="text-lg font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Engagement Frequency</Label>
                      </div>
                      <Select 
                        value={modalState.autoEngage?.frequency.toString() || "4"} 
                        onValueChange={handleFrequencyChange}
                        disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage"}
                      >
                        <SelectTrigger className="w-full h-10 text-sm font-medium border border-[hsl(var(--macadamia-beige))] dark:border-gray-700 rounded-lg hover:border-[hsl(var(--primary))] dark:hover:border-[hsl(var(--primary))] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 border-[hsl(var(--macadamia-beige))] bg-white dark:bg-gray-800">
                          {[0.0833, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 24].map(hours => (
                            <SelectItem key={hours} value={hours.toString()} className="text-base py-3 rounded-lg hover:bg-[hsl(var(--venetian-lace))] dark:hover:bg-gray-700">
                              {hours === 0.0833 ? "Every 5 minutes" : 
                               hours === 0.25 ? "Every 15 minutes" :
                               hours === 0.5 ? "Every 30 minutes" :
                               `Every ${hours === 1 ? "hour" : `${hours} hours`}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often to check for new tweets to reply to
                      </p>
                    </div>
                    
                    {/* Max Replies Setting */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-5 w-5 text-[hsl(var(--primary))]" />
                                                  <Label htmlFor="maxReplies" className="text-base font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Maximum Tweets to Engage</Label>
                        <span className="text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--venetian-lace))] dark:bg-[hsl(var(--primary))]/20 px-2 py-1 rounded border ml-auto">
                          {modalState.autoEngage?.maxReplies || 3}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          id="maxReplies"
                          min={1}
                          max={5}
                          step={1}
                          value={[modalState.autoEngage?.maxReplies || 3]}
                          onValueChange={handleMaxRepliesChange}
                          disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage"}
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
                        Maximum replies to post per engagement cycle
                      </p>
                    </div>
                  </div>

                  {/* Quality Filter Settings */}
                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[hsl(var(--primary))]" />
                        <Label className="text-base font-semibold text-[hsl(var(--fence-green))] dark:text-gray-100">Quality Filter</Label>
                      </div>
                      <Switch
                        checked={modalState.autoEngage?.qualityFilter !== undefined ? modalState.autoEngage.qualityFilter : true}
                        onCheckedChange={handleQualityFilterChange}
                        disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground -mt-2">
                      Uses AI to filter out spam, scams, and low-quality tweets
                    </p>

                    {/* Strictness Level - Only show when quality filter is enabled */}
                    {(modalState.autoEngage?.qualityFilter !== undefined ? modalState.autoEngage.qualityFilter : true) && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="strictnessLevel" className="text-sm font-medium text-[hsl(var(--fence-green))] dark:text-gray-100">Strictness Level</Label>
                          <span className="text-sm font-bold text-[hsl(var(--primary))] bg-[hsl(var(--venetian-lace))] dark:bg-[hsl(var(--primary))]/20 px-2 py-1 rounded border">
                            {modalState.autoEngage?.strictnessLevel !== undefined ? modalState.autoEngage.strictnessLevel : 2}
                          </span>
                        </div>
                        <Slider
                          id="strictnessLevel"
                          min={0}
                          max={5}
                          step={1}
                          value={[modalState.autoEngage?.strictnessLevel !== undefined ? modalState.autoEngage.strictnessLevel : 2]}
                          onValueChange={handleStrictnessChange}
                          disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage"}
                          className="w-full mb-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {getStrictnessDescription(modalState.autoEngage?.strictnessLevel !== undefined ? modalState.autoEngage.strictnessLevel : 2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between items-center pt-4 mt-4 border-t border-[hsl(var(--macadamia-beige))]/70 dark:border-gray-700/70">
                <Button
                  variant="outline"
                  onClick={closeAutoEngageModal}
                  disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage"}
                  className="mr-auto h-10 px-4 text-sm font-medium border border-[hsl(var(--macadamia-beige))] hover:border-[hsl(var(--primary))] rounded-lg hover:bg-[hsl(var(--venetian-lace))] dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </Button>
                
                <div className="flex gap-3">
                  {/* Instant Auto Engage Button - Show when config is loaded */}
                  {realConfig && (
                    <Button 
                      variant="outline"
                      onClick={testAutoEngage}
                      disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_test" ||
                               modalState.actionLoading === modalState.autoEngage?.agentId + "_engage" ||
                               isLoadingConfig ||
                               (replyUsage && replyUsage.percentage >= 100)}
                      className="h-10 px-4 text-sm font-medium border border-[hsl(var(--primary))] hover:border-[hsl(var(--primary))]/80 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded-lg transition-all duration-200 flex items-center gap-2"
                      title={replyUsage && replyUsage.percentage >= 100 ? "Monthly reply limit reached" : "Run auto-engage immediately"}
                    >
                      {modalState.actionLoading === modalState.autoEngage?.agentId + "_test" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      {modalState.actionLoading === modalState.autoEngage?.agentId + "_test" ? "Running..." : "Instant Engage"}
                    </Button>
                  )}
                  
                  {realConfig?.enabled ? (
                    <Button 
                      variant="destructive"
                      onClick={() => saveAutoEngageConfig(false)}
                      disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage" ||
                               modalState.actionLoading === modalState.autoEngage?.agentId + "_test" ||
                               isLoadingConfig}
                      className="h-10 px-6 text-sm font-semibold rounded-lg border border-red-500 hover:border-red-600 transition-all duration-200"
                    >
                      {modalState.actionLoading === modalState.autoEngage?.agentId + "_engage" && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      Turn Off
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => saveAutoEngageConfig(true)}
                      disabled={modalState.actionLoading === modalState.autoEngage?.agentId + "_engage" ||
                               modalState.actionLoading === modalState.autoEngage?.agentId + "_test" ||
                               isLoadingConfig}
                      className="h-10 px-6 text-sm font-semibold rounded-lg bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--pumpkin-vapor))] hover:from-[hsl(var(--primary))]/90 hover:to-[hsl(var(--pumpkin-vapor))]/90 transition-all duration-200"
                    >
                      {modalState.actionLoading === modalState.autoEngage?.agentId + "_engage" && (
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