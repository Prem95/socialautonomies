export interface Agent {
  agentId: string;
  name: string;
  goal: string;
  status: string;
  language: string;
  startTime?: Date | null;
  endTime?: Date | null;
  autoTweetEnabled: boolean;
  autoTweetFrequencyHours?: number | null;
  lastAutoTweetTime?: Date | null;
  autoTweetCount?: number | null;
  isTwitterConnected?: boolean;
  twitterUsername?: string | null;
  autoEngageEnabled?: boolean;
  autoEngageFrequencyHours?: number | null;
  autoEngageMaxReplies?: number | null;
  autoEngageMinScore?: number | null;
  autoEngageAutoReply?: boolean | null;
} 