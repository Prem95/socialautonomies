/**
 * Application constants and configuration
 */

// API endpoints
export const API_ENDPOINTS = {
  // Agent endpoints
  AGENTS: '/api/agents',
  AGENT_DETAIL: (id: string) => `/api/agents/${id}`,
  AGENT_DEPLOY: (id: string) => `/api/agents/${id}/deploy`,
  AGENT_STOP: (id: string) => `/api/agents/${id}/stop`,
  AGENT_EDIT: (id: string) => `/api/agents/${id}/edit`,
  AGENT_DELETE: (id: string) => `/api/agents/${id}/delete`,
  AGENT_START: (id: string) => `/api/agents/${id}/start`,
  AGENT_STATUS: (id: string) => `/api/agents/${id}/status`,
  AGENT_TWEETS: (id: string) => `/api/agents/${id}/tweets`,
  AGENT_AUTO_TWEET: (id: string) => `/api/agents/${id}/auto-tweet`,
  AGENT_AUTO_TWEET_CONFIG: (id: string) => `/api/agents/${id}/auto-tweet-config`,
  AGENT_AUTO_TWEET_CONFIG_DELETE: (id: string) => `/api/agents/${id}/auto-tweet-config-delete`,
};

// Default polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  AGENT_STATUS: 30 * 1000, // 30 seconds
  TWEETS: 60 * 1000 // 1 minute
}; 