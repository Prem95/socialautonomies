import { memo } from "react";
import { AgentCard } from "@/components/dashboard/agent-card";
import { Agent } from "../types";

interface AgentsListProps {
  agents: Agent[];
  actionLoading: string | null;
  profile: any;
  handleStartAgent: (agentId: string) => Promise<void>;
  handleStopAgent: (agentId: string) => Promise<void>;
  handleDeleteAgent: (agentId: string) => Promise<void>;
  handleDisconnectX: (agentId: string) => Promise<void>;
  openTweetModal: (agentId: string) => void;
  openAutoTweetModal: (agent: Agent) => void;
  openAutoEngageModal: (agent: Agent) => void;
  disableAutoTweet: (agentId: string) => Promise<void>;
  getStatusBadge: (status: string) => JSX.Element;
  setActionLoading: (loading: string | null) => void;
  openEditModal: (agent: Agent) => void;
}

const AgentsListComponent = memo(function AgentsList({
  agents,
  actionLoading,
  profile,
  handleStartAgent,
  handleStopAgent,
  handleDeleteAgent,
  handleDisconnectX,
  openTweetModal,
  openAutoTweetModal,
  openAutoEngageModal,
  disableAutoTweet,
  getStatusBadge,
  setActionLoading,
  openEditModal,
}: AgentsListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <div key={agent.agentId}>
          <AgentCard
            agent={agent}
            actionLoading={actionLoading}
            profile={profile}
            handleStartAgent={handleStartAgent}
            handleStopAgent={handleStopAgent}
            handleDeleteAgent={handleDeleteAgent}
            handleDisconnectX={handleDisconnectX}
            openTweetModal={openTweetModal}
            openAutoTweetModal={openAutoTweetModal}
            openAutoEngageModal={openAutoEngageModal}
            disableAutoTweet={disableAutoTweet}
            getStatusBadge={getStatusBadge}
            setActionLoading={setActionLoading}
            openEditModal={openEditModal}
          />
        </div>
      ))}
    </div>
  );
});

export { AgentsListComponent as AgentsList }; 