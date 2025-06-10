import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface ChatCompletionConfig {
  provider: 'openrouter' | 'openai';
  openrouterApiKey?: string;
  openrouterSiteUrl?: string;
  openrouterSiteName?: string;
  openaiApiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class ChatCompletion {
  private openai: OpenAI;
  private config: ChatCompletionConfig;

  constructor(config: ChatCompletionConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...config
    };

    if (this.config.provider === 'openrouter') {
      if (!this.config.openrouterApiKey) {
        throw new Error('OpenRouter API key is required');
      }

      this.openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: this.config.openrouterApiKey,
        defaultHeaders: {
          "HTTP-Referer": this.config.openrouterSiteUrl || "",
          "X-Title": this.config.openrouterSiteName || "",
        },
      });
    } else {
      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey
      });
    }
  }

  async generateConversation(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    try {
      const temperature = options.temperature ?? this.config.temperature;
      const maxTokens = options.maxTokens ?? this.config.maxTokens;

      if (this.config.provider === 'openrouter') {
        const completion = await this.openai.chat.completions.create({
          model: this.config.model || "mistralai/mistral-small-3.1-24b-instruct:free",
          messages: messages as any,
          temperature,
          max_tokens: maxTokens,
        });

        return completion.choices[0].message.content || '';
      } else {
        const completion = await this.openai.chat.completions.create({
          model: this.config.model || "gpt-4",
          messages: messages as any,
          temperature,
          max_tokens: maxTokens,
        });

        return completion.choices[0].message.content || '';
      }
    } catch (error) {
      console.error('Error generating conversation:', error);
      throw error;
    }
  }
}

// Helper function to create a chat completion instance based on environment variables
export function createChatCompletion(): ChatCompletion {
  const provider = process.env.CHAT_PROVIDER || 'openai';
  
  const config: ChatCompletionConfig = {
    provider: provider as 'openrouter' | 'openai',
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterSiteUrl: process.env.OPENROUTER_SITE_URL,
    openrouterSiteName: process.env.OPENROUTER_SITE_NAME,
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.CHAT_MODEL,
    temperature: process.env.CHAT_TEMPERATURE ? parseFloat(process.env.CHAT_TEMPERATURE) : undefined,
    maxTokens: process.env.CHAT_MAX_TOKENS ? parseInt(process.env.CHAT_MAX_TOKENS) : undefined,
  };

  return new ChatCompletion(config);
} 