"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Activity,
  Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";

interface AutoEngageAnalyticsProps {
  agentId: string;
  className?: string;
}

interface AnalyticsData {
  summary: {
    totalReplies: number;
    postedReplies: number;
    pendingReplies: number;
    rejectedReplies: number;
    failedReplies: number;
    successRate: number;
    avgScore: number;
    avgConfidence: number;
  };
  trends: {
    replyGrowth: number;
    successRateGrowth: number;
  };
  dailyActivity: Array<{
    date: string;
    total_replies: number;
    posted_replies: number;
    pending_replies: number;
    rejected_replies: number;
    failed_replies: number;
    avg_score: number;
    avg_confidence: number;
  }>;
  topReplies: Array<{
    replyId: string;
    originalTweetText: string;
    originalTweetUser: string;
    replyText: string;
    score: number;
    confidence: number;
    postedTime: string;
    twitterReplyId: string;
  }>;
  recentActivity: Array<{
    replyId: string;
    originalTweetText: string;
    originalTweetUser: string;
    replyText: string;
    status: string;
    score: number;
    confidence: number;
    createdAt: string;
    postedTime: string;
    twitterReplyId?: string;
  }>;
  configuration: {
    enabled: boolean;
    frequencyHours: number;
    maxReplies: number;
    minScore: number;
    lastRun: string;
  };
}

export function AutoEngageAnalytics({ agentId, className }: AutoEngageAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (agentId) {
      loadAnalytics();
    }
  }, [agentId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/agents/${agentId}/auto-engage/analytics?period=${period}`);
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error("Error loading auto-engage analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'failed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Process daily activity data for charts
  const processedDailyData = analytics?.dailyActivity.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    totalReplies: Number(day.total_replies),
    postedReplies: Number(day.posted_replies),
    pendingReplies: Number(day.pending_replies),
    rejectedReplies: Number(day.rejected_replies),
    avgScore: Number(day.avg_score),
    avgConfidence: Number(day.avg_confidence),
    successRate: day.total_replies > 0 ? (Number(day.posted_replies) / Number(day.total_replies)) * 100 : 0
  })) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analytics data available.</p>
          <p className="text-sm">Start using auto-engage to see insights here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Auto-Engage Analytics</h2>
          <p className="text-muted-foreground">Monitor your agent's engagement performance and activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Box 1: Engagement Summary */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Engagement Summary</CardTitle>
                  <CardDescription>Key reply metrics and trends</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <span className="text-base font-medium">Total Replies</span>
                    </div>
                    <div className="text-3xl font-bold">{analytics.summary.totalReplies}</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-base font-medium">Posted Replies</span>
                    </div>
                    <div className="text-3xl font-bold">{analytics.summary.postedReplies}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Box 4: Configuration Status */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Current Configuration</CardTitle>
                  <CardDescription>Auto-engage settings and last run information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge variant={analytics.configuration.enabled ? "success" : "secondary"}>
                        {analytics.configuration.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Frequency</div>
                      <div className="font-medium">
                        {analytics.configuration.frequencyHours ? `Every ${analytics.configuration.frequencyHours}h` : 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Max Replies / Run</div>
                      <div className="font-medium">{analytics.configuration.maxReplies || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Min. Score</div>
                      <div className="font-medium">{analytics.configuration.minScore || 'N/A'}</div>
                    </div>
                  </div>
                  {analytics.configuration.lastRun && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">Last Run</div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(analytics.configuration.lastRun), { addSuffix: true })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Performance Tab - Now contains Recent Activity */}
        <TabsContent value="performance" className="space-y-6">
          {/* Recent Activity Card - Moved here */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest auto-engage actions and replies</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {analytics.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentActivity.map((reply) => (
                      <div key={reply.replyId} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">@{reply.originalTweetUser}</span>
                              <Badge className={getStatusColor(reply.status)}>
                                {getStatusIcon(reply.status)}
                                <span className="ml-1 capitalize">{reply.status}</span>
                              </Badge>
                              {reply.status === 'posted' && reply.twitterReplyId && (
                                <a
                                  href={`https://twitter.com/i/web/status/${reply.twitterReplyId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-500 hover:text-blue-700"
                                  aria-label="View on X"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            <span className="font-medium">Original:</span> {reply.originalTweetText}
                          </div>
                          <div className="text-sm line-clamp-2">
                            <span className="font-medium">Reply:</span> {reply.replyText}
                          </div>
                        </div>
                        
                        {reply.postedTime && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Posted: {formatDistanceToNow(new Date(reply.postedTime), { addSuffix: true })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity found</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 