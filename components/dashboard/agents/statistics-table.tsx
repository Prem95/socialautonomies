"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Agent {
  id: string;
  name: string;
  status: "active" | "paused" | "error";
  startedAt: Date;
  tweetCount: number;
  performance: number;
}

export function AgentStatisticsTable() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sortField, setSortField] = useState<keyof Agent>("startedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Fetch agents data
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    // This will be replaced with actual API call
    const mockAgents: Agent[] = [
      {
        id: "1",
        name: "Tech News Bot",
        status: "active",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        tweetCount: 147,
        performance: 92,
      },
      {
        id: "2",
        name: "AI Updates",
        status: "paused",
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        tweetCount: 45,
        performance: 88,
      },
    ];
    setAgents(mockAgents);
  };

  const handleSort = (field: keyof Agent) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Agents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Runtime</th>
                <th className="text-right py-2">Tweets</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent) => (
                <tr key={agent.id} className="border-b">
                  <td className="py-2">{agent.name}</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        agent.status === "active"
                          ? "bg-success/10 text-success"
                          : agent.status === "paused"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {formatDistanceToNow(agent.startedAt)}
                  </td>
                  <td className="py-2 text-right">{agent.tweetCount}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => console.log("Toggle agent:", agent.id)}
                      >
                        {agent.status === "active" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => console.log("Delete agent:", agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}