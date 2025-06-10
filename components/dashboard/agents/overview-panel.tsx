"use client";

import { useEffect, useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { Bot, BarChart2, Clock, MessageSquare, TrendingUp, Loader2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface AgentStats {
  totalAgents: number;
  maxAgentsAllowed: number;
  activeAgents: number;
  totalTweets: number;
  uptime: string;
  engagementRate: string;
  growthRate: string;
}

interface AgentOverviewPanelProps {
  stats?: {
    totalAgents: number;
    maxAgentsAllowed: number;
    activeAgents: number;
    totalTweets: number;
    uptime: string;
    engagementRate: string;
    growthRate: string;
  };
}

const AgentOverviewPanelComponent = memo(function AgentOverviewPanel({ stats: propStats }: AgentOverviewPanelProps) {
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    maxAgentsAllowed: 0,
    activeAgents: 0,
    totalTweets: 0,
    uptime: "0h 0m",
    engagementRate: "0%",
    growthRate: "0%"
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (propStats) {
      setStats({
        totalAgents: propStats.totalAgents || 0,
        maxAgentsAllowed: propStats.maxAgentsAllowed || 0,
        activeAgents: propStats.activeAgents || 0,
        totalTweets: propStats.totalTweets || 0,
        uptime: propStats.uptime || "0h 0m",
        engagementRate: propStats.engagementRate || "0%",
        growthRate: propStats.growthRate || "0%"
      });
      setIsLoading(false);
    }
  }, [propStats]);

  const statsCards = [
    {
      icon: Bot,
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
      value: isLoading ? null : `${stats.activeAgents} / ${stats.maxAgentsAllowed}`,
      label: "Active Agents",
    },
    {
      icon: MessageSquare,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-500",
      value: isLoading ? null : stats.totalTweets,
      label: "Total Tweets",
    },
    {
      icon: BarChart2,
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
      value: "Coming Soon!",
      label: "Avg. engagement rate",
      comingSoon: true
    },
    {
      icon: TrendingUp,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
      value: "Coming Soon!",
      label: "Weekly follower growth",
      comingSoon: true
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((card, index) => {
        const IconComponent = card.icon;
        
        return (
          <div key={card.label}>
            <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 overflow-hidden relative">                
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center shadow-md transition-transform hover:scale-105`}>
                    <IconComponent className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  {card.comingSoon && (
                    <span className="ml-3 text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
                      {card.label.includes("engagement") ? "Engagement" : "Growth"}
                    </span>
                  )}
                </div>
                
                <h3 className={`text-3xl font-bold ${card.comingSoon ? 'text-gray-500' : 'text-gray-900'} mb-2`}>
                  {card.value === null ? (
                    <div className="flex items-center justify-center h-9">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                  ) : (
                    card.value
                  )}
                </h3>
                
                <p className="text-sm text-gray-500 font-medium">
                  {card.comingSoon ? card.label : card.label}
                </p>

                {/* Simplified decorative element */}
                <div className={`absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-${card.bgColor.includes('red') ? 'red' : card.bgColor.includes('orange') ? 'orange' : card.bgColor.includes('green') ? 'green' : 'blue'}-100/50 to-transparent rounded-full opacity-20`}
                  style={{
                    background: `radial-gradient(circle, ${
                      card.bgColor.includes('red') ? 'rgba(239, 68, 68, 0.1)' :
                      card.bgColor.includes('orange') ? 'rgba(249, 115, 22, 0.1)' :
                      card.bgColor.includes('green') ? 'rgba(34, 197, 94, 0.1)' :
                      'rgba(59, 130, 246, 0.1)'
                    } 0%, transparent 70%)`
                  }}
                />
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
});

export { AgentOverviewPanelComponent as AgentOverviewPanel };