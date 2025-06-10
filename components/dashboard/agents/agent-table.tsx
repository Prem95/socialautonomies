"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface Agent {
  id: string;
  name: string;
  startedAt: Date;
  tweetsPosted: number;
  tags: string[];
  model: string;
}

interface AgentTableProps {
  agents: Agent[];
  onStopAgent: (id: string) => void;
}

export function AgentTable({ agents, onStopAgent }: AgentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent Name</TableHead>
          <TableHead>Running Since</TableHead>
          <TableHead>Tweets Posted</TableHead>
          <TableHead>Tags Used</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell className="font-medium">{agent.name}</TableCell>
            <TableCell>{formatDistanceToNow(agent.startedAt)} ago</TableCell>
            <TableCell>{agent.tweetsPosted}</TableCell>
            <TableCell>{agent.tags.join(", ")}</TableCell>
            <TableCell>{agent.model}</TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onStopAgent(agent.id)}
              >
                Stop Agent
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}