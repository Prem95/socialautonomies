"use client";

import { useState } from "react";
import { EditAgentCard } from "./edit-agent-card";
import { EditAgentDialog } from "./edit-agent-dialog";

const mockAgents = [
  {
    id: "1",
    name: "Tech News Bot",
    personality: "Professional and informative",
    model: "GPT-4",
    status: "active",
  },
  {
    id: "2",
    name: "Marketing Assistant",
    personality: "Friendly and engaging",
    model: "Claude",
    status: "paused",
  },
];

export function EditAgentList() {
  const [selectedAgent, setSelectedAgent] = useState<typeof mockAgents[0] | null>(null);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {mockAgents.map((agent) => (
        <EditAgentCard
          key={agent.id}
          agent={agent}
          onEdit={() => setSelectedAgent(agent)}
        />
      ))}
      
      <EditAgentDialog
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={() => setSelectedAgent(null)}
      />
    </div>
  );
}