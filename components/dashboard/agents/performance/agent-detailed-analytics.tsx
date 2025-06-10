"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface AgentDetailedAnalyticsProps {
  agentId: string;
  chartType?: 'activity' | 'engagement';
}

// Mock data - replace with actual API call
const mockData = [
  { date: "2024-01-01", tweets: 45, engagement: 2.8, impressions: 12000 },
  { date: "2024-01-02", tweets: 52, engagement: 3.2, impressions: 15000 },
  { date: "2024-01-03", tweets: 48, engagement: 2.9, impressions: 13500 },
  { date: "2024-01-04", tweets: 60, engagement: 3.5, impressions: 18000 },
  { date: "2024-01-05", tweets: 55, engagement: 3.1, impressions: 16500 },
];

export function AgentDetailedAnalytics({ agentId, chartType = 'activity' }: AgentDetailedAnalyticsProps) {
  const formatDate = (date: string) => {
    // Convert YYYY-MM-DD to MM-DD format for more compact display
    const parts = date.split('-');
    return `${parts[1]}-${parts[2]}`;
  };

  // Custom tooltip styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-4 rounded-md shadow-md">
          <p className="font-semibold mb-2">{`Date: ${label}`}</p>
          {chartType === 'activity' ? (
            <>
              <p className="text-primary"><span className="font-medium">Tweets:</span> {payload[0].value}</p>
              <p className="text-muted-foreground text-sm mt-1">Daily tweet volume</p>
            </>
          ) : (
            <>
              <p className="text-emerald-500"><span className="font-medium">Engagement:</span> {payload[0].value}%</p>
              <p className="text-muted-foreground text-sm mt-1">Interaction per impression</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartType === 'activity') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date"
              tickFormatter={formatDate} 
              fontSize={14}
              tickMargin={10}
              stroke="hsl(var(--foreground))"
            />
            <YAxis 
              fontSize={14} 
              width={40} 
              stroke="hsl(var(--foreground))"
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              formatter={() => <span className="text-base font-medium">Tweet Volume</span>} 
            />
            <Line
              name="Tweets"
              type="monotone"
              dataKey="tweets"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2 }}
              activeDot={{ r: 8, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              animationDuration={1000}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate} 
            fontSize={14}
            tickMargin={10}
            stroke="hsl(var(--foreground))"
          />
          <YAxis 
            fontSize={14} 
            width={40} 
            stroke="hsl(var(--foreground))"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            formatter={() => <span className="text-base font-medium">Engagement Rate</span>} 
          />
          <Line
            name="Engagement"
            type="monotone"
            dataKey="engagement"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ r: 6, fill: "#22c55e", strokeWidth: 2 }}
            activeDot={{ r: 8, stroke: "hsl(var(--background))", strokeWidth: 2 }}
            animationDuration={1000}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return renderChart();
}