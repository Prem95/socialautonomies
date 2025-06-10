import { Agent } from "../../hooks/use-dashboard-state";

export interface TweetModalState {
  isOpen: boolean;
  agentId: string | null;
  text: string;
  generatedText: string;
  context: string;
  url: string;
  xAccountToTag: string;
  stage: 'idle' | 'generating' | 'posting' | 'complete' | 'error';
  progress: number;
  isLoading: boolean;
  isScheduleEnabled: boolean;
  scheduleTime: string;
  generationsInfo?: {
    used: number;
    total: number;
    remaining: number;
  };
}

export interface EditAgentModalState {
  isOpen: boolean;
  agent: Agent | null;
}

export interface AutoTweetModalState {
  isOpen: boolean;
  agentId: string | null;
  frequency: number;
  count: number;
}

export interface AutoEngageModalState {
  isOpen: boolean;
  agentId: string | null;
  frequency: number;
  maxReplies: number;
  minScore: number;
  autoReply: boolean;
  qualityFilter: boolean;
  strictnessLevel: number;
}

export interface DashboardModalState {
  tweet: TweetModalState;
  autoTweet: AutoTweetModalState;
  autoEngage: AutoEngageModalState;
  edit: EditAgentModalState;
  actionLoading: string | null;
}

export interface ModalProps {
  modalState: DashboardModalState;
  setModalState: (state: DashboardModalState) => void;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  refreshAgents: () => Promise<void>;
} 