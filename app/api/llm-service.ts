/**
 * LLM Service
 * 
 * Service for interacting with LLM providers via OpenRouter
 */

import OpenAI from "openai";
import prisma from "../db/utils/dbClient";
import { LLMPrompts, TweetContext, AgentPersonality } from "./prompts/llm-prompts";

export interface LLMServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMServiceResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export class LLMService {
  private client: OpenAI;
  private config: LLMServiceConfig;

  constructor(config: LLMServiceConfig = {}) {
    this.config = {
      model: config.model || "deepseek/deepseek-chat-v3-0324",
      temperature: config.temperature || 0.9,
      maxTokens: config.maxTokens || 500
    };

    // Initialize OpenRouter client
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  /**
   * Generate text using OpenRouter
   * 
   * @param prompt - The system prompt to guide the LLM
   * @param userPrompt - The user message/prompt
   * @returns Promise with the LLM response
   */
  async generateText(prompt: string, userPrompt: string): Promise<LLMServiceResponse> {
    try {
      console.log(`Using OpenRouter model: ${this.config.model}`);

      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content || ""
      };
    } catch (error) {
      console.error("LLM service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate an original tweet
   * 
   * @param agentId - ID of the agent to generate tweet for
   * @param context - Optional context for the tweet (e.g., trending topics)
   * @param url - Optional URL to include in context
   * @param xAccountToTag - Optional X account to tag in the tweet
   * @returns Promise with the generated tweet content
   */
  async generateAgentTweet(agentId: string, context?: string, url?: string, xAccountToTag?: string): Promise<LLMServiceResponse> {
    try {
          // console.log(`[LLM Service] Generating tweet for agent: ${agentId}`);
    // console.log(`[LLM Service] Context: ${context || 'none'}, URL: ${url || 'none'}, Tag: ${xAccountToTag || 'none'}`);

      // Get agent from database
      const agent = await prisma.agent.findUnique({
        where: { agentId }
      });

      if (!agent) {
        console.error(`[LLM Service] Agent not found: ${agentId}`);
        return {
          success: false,
          error: "Agent not found"
        };
      }

      // console.log(`[LLM Service] Agent found: ${agent.name}`);

      // Create agent personality object
      const agentPersonality: AgentPersonality = {
        name: agent.name,
        goal: agent.goal,
        brand: agent.brand,
        language: agent.language,
        exampleUserQuestion: agent.exampleUserQuestion,
        exampleAgentReply: agent.exampleAgentReply
      };

      // Create tweet context
      const tweetContext: TweetContext = {
        type: 'original',
        context,
        url,
        xAccountToTag
      };

      // Create system prompt using the prompts service
      const systemPrompt = LLMPrompts.createOriginalTweetPrompt(agentPersonality, tweetContext);
      const userPrompt = LLMPrompts.getUserPrompts().originalTweet;

      // Generate tweet text
      const result = await this.generateText(systemPrompt, userPrompt);

      if (result.success && result.content) {
        // Clean up the response
        const originalContent = result.content;
        result.content = this.cleanTweetText(result.content);

        // Validate the cleaned output
        if (result.content && !this.validateTweetOutput(result.content)) {
          console.warn(`[LLM Service] Generated tweet failed validation for agent ${agentId}. Tweet: "${result.content}"`);
          return {
            success: false,
            error: "Generated tweet failed validation"
          };
        }

        // If URL is provided but not properly formatted on a new line, fix it
        if (url && result.content && result.content.includes(url) && !result.content.includes(`\n${url}`)) {
          // Remove the URL from wherever it is in the text
          let textWithoutUrl = result.content.replace(url, '').trim();
          // Add it back at the end on a new line
          result.content = `${textWithoutUrl}\n${url}`;
        }

        if (result.content) { // Check if content still exists after potential clearing
          console.log(`[LLM Service] Generated tweet (${result.content.length} chars):`);
          console.log(`[LLM Service] "${result.content}"`);
        }

        if (originalContent !== result.content && result.content) {
          console.log(`[LLM Service] Cleaned up response from original (${originalContent.length} chars)`);
        }
      } else {
        console.error(`[LLM Service] Failed to generate tweet: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error("Tweet generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }



  /**
   * Clean up tweet text from LLM response
   */
  private cleanTweetText(text: string): string {
    let cleaned = text
      .replace(/^["']|["']$/g, "")                        // strip quotes
      .replace(/^(Tweet:|My tweet:|Reply:|My reply:)/i, "") // remove labels
      .replace(/—/g, "-")                                 // replace em-dashes
      .replace(/[.!?\u3002\uff1f\uff01]+$/, "")         // remove sentence-ending punctuation
      .replace(/\s+/g, " ")                               // collapse whitespace
      .trim();

    return cleaned.length > 280 ? cleaned.slice(0, 277) + "..." : cleaned;
  }

  private validateTweetOutput(text: string): boolean {
    // Rule 1: Length check
    if (text.length > 100) {
      console.warn(`[Validation Fail] Text too long: ${text.length} chars. Content: "${text}"`);
      return false;
    }

    // Rule 2: Disallowed characters (excluding common apostrophes within words and @ mentions)
    // Allows apostrophes in contractions (e.g., it's, don't) but disallows leading/trailing or standalone single quotes.
    // Allows @ mentions (e.g., @username) but disallows double quotes, hashtags, and commas.
    const disallowedCharsPattern = /["#,;]|(?:^|\s)'|'(?:$|\s)/; 
    if (disallowedCharsPattern.test(text)) {
      console.warn(`[Validation Fail] Disallowed characters (e.g., ", #, comma, semicolon, or misplaced ') found. Content: "${text}"`);
      return false;
    }

    // Rule 3: Check for "http" literally (usually for URLs) - but allow full URLs
    // We should only block standalone "http" text, not complete URLs
    if (/\bhttp\b(?![s]?:\/\/)/.test(text)) { 
      console.warn(`[Validation Fail] Standalone HTTP text detected. Content: "${text}"`);
      return false;
    }

    // Rule 4: Check if the text *ends* with ., !, or ?
    if (/[.!?]$/.test(text)) { 
      console.warn(`[Validation Fail] Ends with disallowed punctuation. Content: "${text}"`);
      return false;
    }
    
    // Rule 5: Sentence count (allows for one sentence)
    // Remove URLs first to avoid false positives from periods in URLs
    const textWithoutUrls = text.replace(/https?:\/\/[^\s]+/g, '');
    // Split by sentence-ending punctuation that's followed by whitespace or end of string
    const sentences = textWithoutUrls.split(/[.!?](?:\s|$)/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      console.warn(`[Validation Fail] Detected multiple sentences. Content: "${text}"`);
      return false;
    }

    return true;
  }

  /**
   * Generate a reply to a tweet
   * 
   * @param agentId - ID of the agent to generate the reply
   * @param tweetContext - Context about the tweet being replied to
   * @param agentConfig - Optional pre-loaded agent configuration
   * @returns Promise with the generated reply content
   */
  async generateAgentTweetReply(agentId: string, tweetContext: string, agentConfig?: any): Promise<string | null> {
    try {
      console.log(`[LLM Service] Generating tweet reply for agent: ${agentId}`);
      console.log(`[LLM Service] Tweet context: ${tweetContext}`);

      // Get agent from database if not provided
      let agent = agentConfig;
      if (!agent) {
        const dbAgent = await prisma.agent.findUnique({
          where: { agentId }
        });

        if (!dbAgent) {
          console.error(`[LLM Service] Agent not found: ${agentId}`);
          return null;
        }

        agent = dbAgent;
      }

      console.log(`[LLM Service] Using agent: ${agent.name || 'Unknown'}`);

      // Create agent personality object
      const agentPersonality: AgentPersonality = {
        name: agent.name,
        goal: agent.goal,
        brand: agent.brand,
        language: agent.language,
        exampleUserQuestion: agent.exampleUserQuestion,
        exampleAgentReply: agent.exampleAgentReply
      };

      // Create system prompt using the prompts service
      const systemPrompt = LLMPrompts.createReplyTweetPrompt(agentPersonality, tweetContext);
      const userPrompt = LLMPrompts.getUserPrompts().replyTweet;

      const result = await this.generateText(systemPrompt, userPrompt);

      if (result.success && result.content) {
        const cleanedReply = this.cleanTweetText(result.content);

        // Validate the cleaned output
        if (!this.validateTweetOutput(cleanedReply)) {
          console.warn(`[LLM Service] Generated reply failed validation for agent ${agentId}. Reply: "${cleanedReply}"`);
          return null;
        }

        console.log('--------------------------------')
        console.log('[LLM Service] Tweet context: ', tweetContext)
        console.log(`[LLM Service] Generated reply: ${cleanedReply}`);
        console.log('--------------------------------')


        return cleanedReply;
      } else {
        console.error(`[LLM Service] Failed to generate reply: ${result.error}`);
        return null;
      }
    } catch (error) {
      console.error("Tweet reply generation error:", error);
      return null;
    }
  }





  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateAgentTweet instead
   */
  async generateTweet(agentId: string, context?: string, url?: string, xAccountToTag?: string): Promise<LLMServiceResponse> {
    console.warn('[LLM Service] generateTweet is deprecated. Use generateAgentTweet instead.');
    return this.generateAgentTweet(agentId, context, url, xAccountToTag);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateAgentTweetReply instead
   */
  async generateTweetReply(agentId: string, tweetContext: string, agentConfig?: any): Promise<string | null> {
    console.warn('[LLM Service] generateTweetReply is deprecated. Use generateAgentTweetReply instead.');
    return this.generateAgentTweetReply(agentId, tweetContext, agentConfig);
  }
}

const llmService = new LLMService({
  model: "deepseek/deepseek-chat-v3-0324"
});

export default llmService; 