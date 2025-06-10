import type { AgentFormValues } from "@/lib/validations/agent";

// Mock data store
const agents = new Map();

export async function createAgent(userId: string, data: AgentFormValues) {
  const agent = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  agents.set(agent.id, agent);
  return agent;
}

export async function getAgents(userId: string) {
  return Array.from(agents.values()).filter(agent => agent.userId === userId);
}