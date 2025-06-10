import * as z from "zod";

export const agentFormSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be less than 50 characters"),
  purpose: z.string()
    .min(20, "Purpose must be at least 20 characters")
    .max(500, "Purpose must be less than 500 characters")
    .optional(),
  keywords: z.string()
    .min(3, "Add at least one keyword")
    .max(200, "Keywords must be less than 200 characters")
    .optional(),
  exampleReply: z.string()
    .min(20, "Example reply must be at least 20 characters")
    .max(500, "Example reply must be less than 500 characters")
    .optional(),
  personalityType: z.enum([
    "professional",
    "friendly",
    "witty",
    "empathetic",
    "technical",
    "creative"
  ]).optional(),
  modelType: z.string().optional(),
  config: z.object({
    postFrequency: z.number().min(1).max(24).optional(),
    engagementRules: z.object({
      autoLike: z.boolean().optional(),
      autoRetweet: z.boolean().optional(),
      autoFollow: z.boolean().optional(),
    }).optional(),
    contentPreferences: z.object({
      topics: z.array(z.string()).optional(),
      tone: z.string().optional(),
      language: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const agentCreationSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  keywords: z.string()
    .min(3, "Keywords are required")
    .max(200, "Keywords must be less than 200 characters"),
  schedule: z.enum(["hourly", "daily", "weekly"]),
  
  // Account credentials
  email: z.string()
    .email("Please enter a valid email"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must include uppercase, lowercase, number and special character"
    ),
  
  // Personality traits (multi-select)
  personality: z.array(z.string())
    .min(1, "Select at least one personality trait"),
  
  // Example reply
  exampleReply: z.string()
    .min(10, "Please provide a sample tweet or reply")
    .max(280, "X has a 280 character limit"),
  
  // Brand info
  brandLink: z.string()
    .url("Please enter a valid URL"),
  
  // Tweet limits
  maxTweetsPerDay: z.number()
    .min(1, "Minimum 1 tweet per day")
    .max(50, "Maximum 50 tweets per day"),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;
export type AgentCreationValues = z.infer<typeof agentCreationSchema>;