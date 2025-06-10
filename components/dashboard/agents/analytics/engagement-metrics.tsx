"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const mockData = [
  { hour: "00:00", likes: 45, retweets: 12, replies: 8 },
  { hour: "06:00", likes: 78, retweets: 23, replies: 15 },
  { hour: "12:00", likes: 123, retweets: 45, replies: 32 },
  { hour: "18:00", likes: 89, retweets: 34, replies: 21 },
];

export function EngagementMetrics() {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Avg. Likes</div>
          <div className="text-2xl font-bold">83.75</div>
          <div className="text-xs text-muted-foreground">per tweet</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Avg. Retweets</div>
          <div className="text-2xl font-bold">28.5</div>
          <div className="text-xs text-muted-foreground">per tweet</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Avg. Replies</div>
          <div className="text-2xl font-bold">19</div>
          <div className="text-xs text-muted-foreground">per tweet</div>
        </div>
      </div>

      <div className="h-[300px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockData}>
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="likes" fill="hsl(var(--primary))" />
            <Bar dataKey="retweets" fill="hsl(var(--accent-blue))" />
            <Bar dataKey="replies" fill="hsl(var(--accent-purple))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}