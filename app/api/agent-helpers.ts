import { ChatCompletion, ChatMessage } from './chat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  name: string;
  goal: string;
  brand: {
    voice: string;
    personality: string;
    values: string[];
  };
  special_hooks: {
    intro_phrases: string[];
    signature_closings: string[];
    topics_to_focus: string[];
    topics_to_avoid: string[];
  };
  language: string;
  example_user_question: string;
  example_agent_reply: string;
}

/**
 * Load agent configuration from a JSON file
 * 
 * @param configPath - Path to the agent configuration JSON file
 * @returns The agent configuration object
 */
export function loadAgentConfig(configPath: string): AgentConfig {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData) as AgentConfig;
  } catch (error) {
    console.error('Error loading agent configuration:', error);
    throw new Error('Failed to load agent configuration');
  }
}

/**
 * Generate a tweet using the agent configuration
 * 
 * @param chatCompletion - ChatCompletion instance to use for generation
 * @param agentConfig - Agent configuration
 * @param topic - Topic to generate a tweet about
 * @param maxLength - Maximum tweet length (default: 280)
 * @returns The generated tweet text
 */
export async function generateAgentTweet(
  chatCompletion: ChatCompletion,
  agentConfig: AgentConfig,
  topic: string,
  maxLength: number = 280
): Promise<string> {
  try {
    // Build system prompt based on agent configuration
    const systemPrompt = `You are ${agentConfig.name}, an AI assistant with the goal to ${agentConfig.goal}.
      Your brand voice is ${agentConfig.brand.voice} and your personality is ${agentConfig.brand.personality}.
      You value ${agentConfig.brand.values.join(', ')}.

      You often start your messages with phrases like: ${agentConfig.special_hooks.intro_phrases.join(', ')}.
      You sometimes end your messages with: ${agentConfig.special_hooks.signature_closings.join(', ')}.

      You focus on these topics: ${agentConfig.special_hooks.topics_to_focus.join(', ')}.
      You avoid these topics: ${agentConfig.special_hooks.topics_to_avoid.join(', ')}.

      Example question: "${agentConfig.example_user_question}"
      Example response: "${agentConfig.example_agent_reply}"

      Generate a tweet about the requested topic that reflects your personality and values.
      Keep it under ${maxLength} characters, concise but informative.
      DO NOT use hashtags unless specifically relevant.
      DO NOT use emojis.`;

    // Create messages for chat completion
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate a tweet about ${topic}. Keep it under ${maxLength} characters.`
      }
    ];

    // Generate tweet text
    const tweet = await chatCompletion.generateConversation(messages);
    
    // Ensure the tweet is within the length limit
    if (tweet.length > maxLength) {
      return tweet.substring(0, maxLength);
    }
    
    return tweet;
  } catch (error) {
    console.error('Error generating agent tweet:', error);
    throw error;
  }
}