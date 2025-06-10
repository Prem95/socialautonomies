// File: components/AgentTweetActivity.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    RefreshCw,
    ExternalLink,
    Loader2,
    BarChart3,
    Heart,
    Repeat,
    MessageSquare,
    Quote,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Activity,
    TrendingUp,
    Twitter
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AgentTweetActivityProps {
  agentId: string;
  className?: string;
}

interface Tweet {
  tweetId: string;
  text: string;
  postTime: string;
  twitterTweetId: string | null;
  url: string | null;
}

interface TweetAnalyticsV2 {
  tweetId: string;
  text: string;
  impressions: number;
  engagements: number;
  engagementRate: string;
  likes: number;
  retweets: number;
  replies: number;
}

interface TweetScraperAnalytics {
  likes?: number;
  retweets?: number;
  replies?: number;
  quote_count?: number;
  tweetId?: string;
  error?: string;
  text?: string;
}

const TWEETS_PER_PAGE = 10;

export function AgentTweetActivity({ agentId, className }: AgentTweetActivityProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const [selectedTweetAnalyticsV2, setSelectedTweetAnalyticsV2] = useState<TweetAnalyticsV2 | null>(null);
  const [v2AnalyticsDialogOpen, setV2AnalyticsDialogOpen] = useState(false);
  const [loadingV2AnalyticsTweetId, setLoadingV2AnalyticsTweetId] = useState<string | null>(null);

  const [selectedTweetAnalyticsScraper, setSelectedTweetAnalyticsScraper] = useState<TweetScraperAnalytics | null>(null);
  const [scraperAnalyticsDialogOpen, setScraperAnalyticsDialogOpen] = useState(false);
  const [loadingScraperAnalyticsTweetId, setLoadingScraperAnalyticsTweetId] = useState<string | null>(null);

  const fetchTweets = async () => {
    setLoadingV2AnalyticsTweetId(null);
    setLoadingScraperAnalyticsTweetId(null);
    setSelectedTweetAnalyticsV2(null);
    setSelectedTweetAnalyticsScraper(null);
    setV2AnalyticsDialogOpen(false);
    setScraperAnalyticsDialogOpen(false);

    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/agents/${agentId}/tweets`);
      if (!response.ok) throw new Error(`Fetch error ${response.status}`);
      const data = await response.json();
      setTweets(data);
      setError(null);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message);
       toast({ 
         title: "Error Loading Tweets", 
         description: `Failed to load tweets: ${err.message}`, 
         variant: "destructive" 
       });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchTweetAnalyticsV2 = async (tweet: Tweet) => {
    const twitterTweetId = tweet.twitterTweetId;
    if (!twitterTweetId) return;
    setLoadingV2AnalyticsTweetId(twitterTweetId);
    setV2AnalyticsDialogOpen(true);
    setSelectedTweetAnalyticsV2(null);

    try {
      const response = await fetch(`/api/twitter/tweet/${twitterTweetId}/analytics`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `Failed to fetch V2 analytics: ${response.status}`);
      }
      const data = await response.json();

      setSelectedTweetAnalyticsV2({
        tweetId: tweet.tweetId,
        text: tweet.text,
        impressions: data.impressions ?? 0,
        engagements: data.engagements ?? 0,
        engagementRate: data.engagementRate ?? 'N/A',
        likes: data.likes ?? 0,
        retweets: data.retweets ?? 0,
        replies: data.replies ?? 0
      });

    } catch (err: any) {
      console.error("Error fetching V2 tweet analytics:", err);
      setSelectedTweetAnalyticsV2({ tweetId: twitterTweetId, text: tweet.text, error: err.message } as any);
       toast({
          title: "Analytics Error",
          description: err.message || "Could not load V2 analytics.",
          variant: "destructive",
      });
    } finally {
      setLoadingV2AnalyticsTweetId(null);
    }
  };

  const handleFetchScraperAnalytics = async (tweet: Tweet) => {
      const twitterTweetId = tweet.twitterTweetId;
      if (!twitterTweetId) {
          toast({ 
            title: "Missing Tweet ID", 
            description: "Cannot fetch analytics for this tweet.", 
            variant: "destructive" 
          });
          return;
      };
      setLoadingScraperAnalyticsTweetId(twitterTweetId);
      setSelectedTweetAnalyticsScraper(null);
      setScraperAnalyticsDialogOpen(true);

      try {
        const response = await fetch(`/api/twitter/tweet/${twitterTweetId}/analytics-scraper`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || `HTTP error! status: ${response.status}`);
        }
        setSelectedTweetAnalyticsScraper({ ...data, tweetId: twitterTweetId, text: tweet.text });

      } catch (error: any) {
        console.error("Error fetching scraper tweet analytics:", error);
        setSelectedTweetAnalyticsScraper({
            tweetId: twitterTweetId,
            text: tweet.text,
            error: error.message || "Failed to load analytics."
        });
        toast({
          title: "Analytics Error",
          description: error.message || "Could not load live analytics.",
          variant: "destructive",
        });
      } finally {
        setLoadingScraperAnalyticsTweetId(null);
      }
    };

  useEffect(() => {
    fetchTweets();
  }, [agentId]);

  const totalPages = Math.ceil(tweets.length / TWEETS_PER_PAGE);
  const startIndex = (currentPage - 1) * TWEETS_PER_PAGE;
  const sortedTweets = [...tweets].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.postTime).getTime() - new Date(a.postTime).getTime();
    }
    return new Date(a.postTime).getTime() - new Date(b.postTime).getTime();
  });
  const paginatedTweets = sortedTweets.slice(startIndex, startIndex + TWEETS_PER_PAGE);

  const getTweetStatusBadge = (tweet: Tweet) => {
    if (tweet.twitterTweetId) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Activity className="h-3 w-3 mr-1" />
          Posted
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Calendar className="h-3 w-3 mr-1" />
        Draft
      </Badge>
    );
  };

  // Get tweet summary statistics for overview
  const tweetSummary = {
    totalTweets: tweets.length,
    postedTweets: tweets.filter(t => t.twitterTweetId).length,
    draftTweets: tweets.filter(t => !t.twitterTweetId).length,
    successRate: tweets.length > 0 ? (tweets.filter(t => t.twitterTweetId).length / tweets.length) * 100 : 0,
  };

  // Motion animation variants
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

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading tweet activity...
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tweet Activity Analytics</h2>
          <p className="text-muted-foreground">Monitor your agent's tweeting performance and engagement metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchTweets} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Tweet Summary */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Tweet Summary</CardTitle>
                  <CardDescription>Overview of your agent's tweet activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Twitter className="h-5 w-5 text-blue-500" />
                      <span className="text-base font-medium">Total Tweets</span>
                    </div>
                    <div className="text-3xl font-bold">{tweetSummary.totalTweets}</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-5 w-5 text-green-500" />
                      <span className="text-base font-medium">Posted Tweets</span>
                    </div>
                    <div className="text-3xl font-bold">{tweetSummary.postedTweets}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tweet Status Distribution */}
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Tweet Status</CardTitle>
                  <CardDescription>Distribution of tweet posting status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Posted</div>
                      <div className="font-medium text-green-600">{tweetSummary.postedTweets}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Drafts</div>
                      <div className="font-medium text-gray-600">{tweetSummary.draftTweets}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="font-medium">{tweetSummary.successRate.toFixed(1)}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Last Activity</div>
                      <div className="font-medium">
                        {tweets.length > 0 && tweets[0]?.postTime
                          ? formatDistanceToNow(new Date(tweets[0].postTime), { addSuffix: true })
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest tweets and their performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="font-medium">Error loading tweets</span>
                  </div>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              <ScrollArea className="h-96">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`skel-${i}`} className="p-3 border rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-16" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : paginatedTweets.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tweets found</p>
                      <p className="text-xs text-muted-foreground">Start using the tweet generation feature to see activity here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedTweets.map((tweet) => (
                      <motion.div
                        key={tweet.tweetId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              {getTweetStatusBadge(tweet)}
                              <span className="text-xs text-muted-foreground">
                                {tweet.postTime ? formatDistanceToNow(new Date(tweet.postTime), { addSuffix: true }) : 'No timestamp'}
                              </span>
                            </div>
                            
                            <p className="text-sm leading-relaxed">{tweet.text}</p>
                            
                            {tweet.twitterTweetId && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">ID: {tweet.twitterTweetId}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFetchScraperAnalytics(tweet)}
                                    disabled={!tweet.twitterTweetId || loadingScraperAnalyticsTweetId === tweet.twitterTweetId}
                                    className={`h-8 w-8 p-0 ${
                                      !tweet.twitterTweetId
                                        ? "text-gray-400 cursor-not-allowed opacity-50"
                                        : "text-blue-600 hover:bg-blue-100"
                                    }`}
                                  >
                                    {loadingScraperAnalyticsTweetId === tweet.twitterTweetId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <BarChart3 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{tweet.twitterTweetId ? "View Live Analytics" : "Analytics unavailable"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild={!!tweet.twitterTweetId}
                                    className={`h-8 w-8 p-0 ${
                                      tweet.twitterTweetId 
                                        ? "text-gray-700 hover:bg-gray-100" 
                                        : "text-gray-400 cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    {tweet.twitterTweetId ? (
                                      <a
                                        href={`https://x.com/status/${tweet.twitterTweetId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    ) : (
                                      <span>
                                        <ExternalLink className="h-4 w-4" />
                                      </span>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {tweet.twitterTweetId
                                      ? "View on X"
                                      : "Not posted to X"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {!isLoading && tweets.length > TWEETS_PER_PAGE && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(startIndex + TWEETS_PER_PAGE, tweets.length)} of {tweets.length} tweets
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                    >
                       <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                    >
                       Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analytics Dialog */}
      <Dialog open={scraperAnalyticsDialogOpen} onOpenChange={setScraperAnalyticsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tweet Analytics
            </DialogTitle>
            <DialogDescription>
              Live engagement metrics for this tweet
            </DialogDescription>
          </DialogHeader>

          {loadingScraperAnalyticsTweetId || !selectedTweetAnalyticsScraper ? (
             <div className="flex justify-center items-center min-h-[200px]">
               <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
             </div>
          ) : selectedTweetAnalyticsScraper.error ? (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center text-sm text-red-800">
                <p className="font-medium">Error loading analytics:</p>
                <p>{selectedTweetAnalyticsScraper.error}</p>
              </div>
          ) : (
              <div className="space-y-4">
                 {selectedTweetAnalyticsScraper.text && (
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">
                       {selectedTweetAnalyticsScraper.text}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-500"/>
                          <span className="text-sm font-medium">Likes</span>
                        </div>
                        <span className="font-bold text-lg">{selectedTweetAnalyticsScraper.likes?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-green-600"/>
                          <span className="text-sm font-medium">Retweets</span>
                        </div>
                        <span className="font-bold text-lg">{selectedTweetAnalyticsScraper.retweets?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600"/>
                          <span className="text-sm font-medium">Replies</span>
                        </div>
                        <span className="font-bold text-lg">{selectedTweetAnalyticsScraper.replies?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Quote className="w-4 h-4 text-purple-600"/>
                          <span className="text-sm font-medium">Quotes</span>
                        </div>
                        <span className="font-bold text-lg">{selectedTweetAnalyticsScraper.quote_count?.toLocaleString() ?? '0'}</span>
                    </div>
                </div>
              </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}