import { Prisma } from '@prisma/client';

// DTO Types for Plans
export type PlanCreateInput = Prisma.PlanCreateInput;
export type PlanUpdateInput = Prisma.PlanUpdateInput;

// Plans with additional computed fields or nested data
export interface PlanWithUsage extends Prisma.PlanGetPayload<{}> {
  currentActiveUsers?: number;
  totalAgents?: number;
}

// DTO Types for Profiles
export type ProfileCreateInput = Prisma.ProfileCreateInput;
export type ProfileUpdateInput = Prisma.ProfileUpdateInput;

// Profiles with additional fields or nested data
export interface ProfileWithPlan extends Prisma.ProfileGetPayload<{
  include: { plan: true };
}> {}

export interface ProfileWithAgents extends Prisma.ProfileGetPayload<{
  include: { agents: true };
}> {}

export interface ProfileWithAll extends Prisma.ProfileGetPayload<{
  include: { plan: true; agents: { include: { tweets: true } }; cookies: true };
}> {}

// DTO Types for Agents
// Just use Prisma's types directly
export type AgentCreateInput = Prisma.AgentCreateInput;
export type AgentUpdateInput = Prisma.AgentUpdateInput;

// Brand and Special Hooks JSON structures
export interface AgentBrand {
  voice?: string;
  personality?: string;
  values?: string[];
  [key: string]: any;
}

export interface AgentSpecialHooks {
  intro_phrases?: string[];
  signature_closings?: string[];
  topics_to_focus?: string[];
  topics_to_avoid?: string[];
  [key: string]: any;
}

// Agent with computed fields or nested data
export interface AgentWithTweets extends Prisma.AgentGetPayload<{
  include: { tweets: true };
}> {
  tweetCount?: number;
  recentTweets?: Prisma.TweetGetPayload<{}>[];
}

export interface AgentWithProfile extends Prisma.AgentGetPayload<{
  include: { profile: true };
}> {}

export interface AgentWithAll extends Prisma.AgentGetPayload<{
  include: { tweets: true; profile: { include: { plan: true } } };
}> {}

// DTO Types for Tweets
export type TweetCreateInput = Prisma.TweetCreateInput;
export type TweetUpdateInput = Prisma.TweetUpdateInput;

// Tweet with agent information
export interface TweetWithAgent extends Prisma.TweetGetPayload<{
  include: { agent: true };
}> {}

// DTO Types for Cookies
export type CookieCreateInput = Prisma.CookieCreateInput;
export type CookieUpdateInput = Prisma.CookieUpdateInput;

// Cookie search param
export interface CookieSearchParams {
  userId: string;
  key?: string;
  domain?: string;
  path?: string;
  notExpired?: boolean;
}

// Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Status check response
export interface LimitStatus {
  used: number;
  limit: number;
  remaining: number;
  canCreate: boolean;
} 