/**
 * Agent Tweet Service
 * 
 * Service for generating and posting tweets from AI agents
 */

import prisma from "../db/utils/dbClient";
import { TwitterApi } from "./twitter-api";
import { twitterAuthService } from "./twitter-auth-service";
import llmService from "./llm-service";

export interface AgentTweetOptions {
  agentId: string;
  userId: string;
  llmProvider?: "openrouter";
  context?: string;
  url?: string;
  xAccountToTag?: string;
}

export interface AgentTweetResult {
  success: boolean;
  tweet?: {
    id: string;
    text: string;
    twitterId?: string;
    url?: string;
    timestamp?: Date;
  };
  error?: string;
}

/**
 * Agent Tweet Service - Handles the generation and posting of tweets from AI agents
 */
export const agentTweetService = {
  /**
   * Generate a tweet for an agent using LLM
   * 
   * @param options - The agent and configuration options
   * @returns Promise with the generated tweet
   */
  async generateTweet(options: AgentTweetOptions): Promise<AgentTweetResult> {
    try {
      const { agentId, userId, context, url, xAccountToTag } = options;
      
      console.log("AgentTweetService.generateTweet called with:", {
        agentId,
        userId,
        context: context || "not provided",
        url: url || "not provided",
        xAccountToTag: xAccountToTag || "not provided"
      });
      
      // Validate agent ownership
      const agent = await prisma.agent.findUnique({
        where: {
          agentId,
          userId
        }
      });
      
      if (!agent) {
        return {
          success: false,
          error: "Agent not found or access denied"
        };
      }
      
      // Generate tweet text using the default llmService
      const generationResult = await llmService.generateAgentTweet(agentId, context, url, xAccountToTag);
      
      if (!generationResult.success || !generationResult.content) {
        return {
          success: false,
          error: generationResult.error || "Failed to generate tweet content"
        };
      }
      
      return {
        success: true,
        tweet: {
          id: "",
          text: generationResult.content
        }
      };
    } catch (error) {
      console.error("Generate tweet error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Generate and post a tweet for an agent
   * 
   * @param options - The agent and configuration options
   * @returns Promise with the posting result
   */
  async generateAndPostTweet(options: AgentTweetOptions): Promise<AgentTweetResult> {
    try {
      const { agentId, userId } = options;
      
      const generationResult = await this.generateTweet(options);
      
      if (!generationResult.success || !generationResult.tweet) {
        return generationResult;
      }
      
      // Then post it to X
      const postResult = await this.postTweet({
        agentId,
        userId,
        text: generationResult.tweet.text
      });
      
      return postResult;
    } catch (error) {
      console.error("Generate and post tweet error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Post a tweet for an agent
   * 
   * @param options - The post options including tweet text
   * @returns Promise with the posting result
   */
  async postTweet(options: { agentId: string; userId: string; text: string; replyToTweetId?: string }): Promise<AgentTweetResult> {
    try {
      const { agentId, userId, text, replyToTweetId } = options;
      
      // Verify agent ownership
      const agent = await prisma.agent.findUnique({
        where: {
          agentId,
          userId
        }
      });
      
      if (!agent) {
        return {
          success: false,
          error: "Agent not found or access denied"
        };
      }
      
      // Get X API authentication
      const authResult = await twitterAuthService.verifyAuthentication(
        userId,
        agent.name
      );
      
      if (!authResult.authenticated || !authResult.api) {
        return {
          success: false,
          error: authResult.error || "X authentication failed"
        };
      }
      
      // Post the tweet
      const tweetApi: TwitterApi = authResult.api;
      const postResult = await tweetApi.postTweet(text, replyToTweetId);
      
      if (!postResult.success) {
        return {
          success: false,
          error: "Failed to post tweet to X"
        };
      }
      
      // Save the tweet to the database
      const savedTweet = await prisma.tweet.create({
        data: {
          agentId,
          text,
          postTime: postResult.timestamp || new Date(),
          twitterTweetId: postResult.tweetId || null,
          url: postResult.url || null
        }
      });
      
      return {
        success: true,
        tweet: {
          id: savedTweet.tweetId,
          text: savedTweet.text,
          twitterId: savedTweet.twitterTweetId || undefined,
          url: savedTweet.url || undefined,
          timestamp: savedTweet.postTime || undefined
        }
      };
    } catch (error) {
      console.error("Post tweet error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * Schedule a tweet for later posting
   * 
   * @param options - Schedule options
   * @returns Promise with the scheduling result
   */
  async scheduleTweet(options: {
    agentId: string;
    userId: string;
    text: string;
    scheduleTime: Date;
  }): Promise<AgentTweetResult> {
    try {
      const { agentId, userId, text, scheduleTime } = options;
      
      // Verify agent ownership
      const agent = await prisma.agent.findUnique({
        where: {
          agentId,
          userId
        }
      });
      
      if (!agent) {
        return {
          success: false,
          error: "Agent not found or access denied"
        };
      }
      
      const scheduledTweet = await prisma.tweet.create({
        data: {
          agentId,
          text,
          postTime: scheduleTime,
          status: 'scheduled'
        }
      });
      
      return {
        success: true,
        tweet: {
          id: scheduledTweet.tweetId,
          text: scheduledTweet.text,
          timestamp: scheduledTweet.postTime || undefined
        }
      };
    } catch (error) {
      console.error("Schedule tweet error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}; 