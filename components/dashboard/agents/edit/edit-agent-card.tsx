"use client";

import { Bot, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EditAgentCardProps {
  agent: {
    id: string;
    name: string;
    personality: string;
    model: string;
    status: string;
  };
  onEdit: () => void;
}

export function EditAgentCard({ agent, onEdit }: EditAgentCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4" />
          <h3 className="font-semibold">{agent.name}</h3>
        </div>
        <Badge variant={agent.status === "active" ? "success" : "secondary"}>
          {agent.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <strong>Model:</strong> {agent.model}
        </div>
        <div className="text-sm text-muted-foreground">
          <strong>Personality:</strong> {agent.personality}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => console.log("Delete agent:", agent.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button size="sm" onClick={onEdit}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}