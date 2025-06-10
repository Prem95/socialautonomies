import { z } from 'zod';

// Common validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWITTER_USERNAME_REGEX = /^[a-zA-Z0-9_]{1,15}$/;

// Base schemas
export const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');
export const emailSchema = z.string().email().min(5).max(254);
export const nonEmptyStringSchema = z.string().min(1).max(1000);

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  goal: z.string().min(1, 'Goal is required').max(500, 'Goal must be less than 500 characters'),
  language: z.string().min(2).max(10).optional().default('en-US'),
  brand: z.object({
    voice: z.string().optional(),
    personality: z.string().optional(),
    values: z.array(z.string()).optional()
  }).optional(),
  specialHooks: z.object({
    intro_phrases: z.array(z.string()).optional(),
    signature_closings: z.array(z.string()).optional(),
    topics_to_focus: z.array(z.string()).optional(),
    topics_to_avoid: z.array(z.string()).optional()
  }).optional()
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().min(1).max(500).optional(),
  language: z.string().min(2).max(10).optional(),
  autoTweetEnabled: z.boolean().optional(),
  autoTweetFrequencyHours: z.number().min(0.0167).max(168).optional(), // 1 minute to 1 week
  autoTweetCount: z.number().min(1).max(50).optional(),
  autoEngageEnabled: z.boolean().optional(),
  autoEngageFrequencyHours: z.number().min(0.0833).max(168).optional(), // 5 minutes to 1 week
  autoEngageMaxReplies: z.number().min(1).max(50).optional(),
  autoEngageMinScore: z.number().min(0).max(1000).optional(),
  autoEngageAutoReply: z.boolean().optional()
}).refine((data) => {
  // If auto-tweet is enabled, frequency and count are required
  if (data.autoTweetEnabled && (!data.autoTweetFrequencyHours || !data.autoTweetCount)) {
    return false;
  }
  // If auto-engage is enabled, required fields must be present
  if (data.autoEngageEnabled && (
    !data.autoEngageFrequencyHours || 
    !data.autoEngageMaxReplies || 
    data.autoEngageMinScore === undefined
  )) {
    return false;
  }
  return true;
}, {
  message: "When enabling auto-features, all required configuration fields must be provided"
});

// Tweet schemas
export const generateTweetSchema = z.object({
  context: z.string().max(1000).optional(),
  llmProvider: z.enum(['openrouter', 'openai']).optional().default('openrouter'),
  post: z.boolean().optional().default(false),
  text: z.string().max(280).optional(),
  url: z.string().url().optional(),
  xAccountToTag: z.string().regex(TWITTER_USERNAME_REGEX, 'Invalid Twitter username').optional(),
  isRegeneration: z.boolean().optional().default(false)
});

export const postTweetSchema = z.object({
  text: z.string().min(1, 'Tweet text is required').max(280, 'Tweet must be less than 280 characters'),
  replyToTweetId: z.string().optional()
});

export const scheduleTweetSchema = z.object({
  scheduledAt: z.string().datetime('Invalid datetime format'),
  tweet: z.object({
    text: z.string().min(1, 'Tweet text is required').max(280, 'Tweet must be less than 280 characters'),
    context: z.string().max(1000).optional(),
    url: z.string().url().optional()
  })
}).refine((data) => {
  const scheduledTime = new Date(data.scheduledAt);
  const now = new Date();
  return scheduledTime > now;
}, {
  message: "Scheduled time must be in the future"
});

// Reply schemas
export const generateReplySchema = z.object({
  tweetId: z.string().min(1, 'Tweet ID is required'),
  tweetText: z.string().min(1, 'Tweet text is required'),
  tweetUsername: z.string().optional(),
  tweetUserDisplayName: z.string().optional(),
  tweetMedia: z.array(z.object({
    type: z.enum(['photo', 'video', 'animated_gif']),
    url: z.string().url().optional()
  })).optional()
});

export const updateReplySchema = z.object({
  action: z.enum(['approve', 'reject', 'edit', 'schedule'], {
    required_error: "Action is required",
    invalid_type_error: "Action must be one of: approve, reject, edit, schedule"
  }),
  replyText: z.string().min(1).max(280).optional(),
  scheduledTime: z.string().datetime().optional()
}).refine((data) => {
  // If action is edit, replyText is required
  if (data.action === 'edit' && !data.replyText) {
    return false;
  }
  // If action is schedule, scheduledTime is required and must be in future
  if (data.action === 'schedule') {
    if (!data.scheduledTime) return false;
    const scheduledTime = new Date(data.scheduledTime);
    const now = new Date();
    return scheduledTime > now;
  }
  return true;
}, {
  message: "Invalid action configuration"
});

// Auto-engage schemas
export const autoEngageConfigSchema = z.object({
  enabled: z.boolean(),
  frequencyHours: z.number().min(0.0833).max(168).optional(), // 5 minutes to 1 week
  maxReplies: z.number().min(1).max(50).optional(),
  minScore: z.number().min(0).max(1000).optional(),
  autoReply: z.boolean().optional()
}).refine((data) => {
  if (data.enabled) {
    return data.frequencyHours !== undefined && 
           data.maxReplies !== undefined && 
           data.minScore !== undefined;
  }
  return true;
}, {
  message: "When enabling auto-engage, frequencyHours, maxReplies, and minScore are required"
});

export const autoEngageActionSchema = z.object({
  action: z.enum(['trigger_cycle', 'test_analysis']),
  dryRun: z.boolean().optional().default(false)
});

// Auth schemas
export const twitterAuthSchema = z.object({
  cookies: z.object({
    auth_token: z.string().min(1, 'auth_token is required'),
    ct0: z.string().min(1, 'ct0 is required'),
    twid: z.string().min(1, 'twid is required')
  })
});

export const refreshCookiesSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  agentId: uuidSchema.optional(),
  email: emailSchema.optional(),
  manualCookies: z.object({
    auth_token: z.string().min(1),
    ct0: z.string().min(1),
    twid: z.string().min(1)
  }).optional()
}).refine((data) => {
  // Either manual cookies OR username/password/email should be provided
  const hasManualCookies = data.manualCookies;
  const hasCredentials = data.username && data.password && data.email;
  return hasManualCookies || hasCredentials;
}, {
  message: "Either manual cookies or username/password/email must be provided"
});

// Profile schemas
export const updateProfileSchema = z.object({
  // Add profile-specific fields as needed
});

export const assignPlanSchema = z.object({
  planId: z.string().or(z.number()),
  yearly: z.boolean().optional().default(false)
});

// Stripe schemas
export const createCheckoutSchema = z.object({
  planId: z.string().or(z.number()),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL')
});

export const changeSubscriptionSchema = z.object({
  planId: z.string().or(z.number()),
  currentPlanId: z.string().or(z.number()).optional(),
  action: z.enum(['upgrade', 'downgrade', 'change']),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  yearly: z.boolean().optional().default(false)
});

// Waitlist schema
export const waitlistSchema = z.object({
  email: emailSchema.refine(
    (email) => {
      // Check for disposable email domains
      const disposableDomains = [
        'tempmail.com', 'throwawaymail.com', 'mailinator.com',
        'yopmail.com', 'guerrillamail.com', 'sharklasers.com',
        '10minutemail.com', 'trashmail.com', 'temp-mail.org'
      ];
      return !disposableDomains.some(domain => email.toLowerCase().includes(domain));
    },
    { message: "Disposable email addresses are not allowed" }
  )
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform((val) => parseInt(val) || 1).pipe(z.number().min(1).max(1000)),
  limit: z.string().transform((val) => Math.min(parseInt(val) || 20, 100)).pipe(z.number().min(1).max(100)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const periodSchema = z.object({
  period: z.string().transform((val) => Math.min(parseInt(val) || 30, 365)).pipe(z.number().min(1).max(365))
});

export const timelineQuerySchema = z.object({
  count: z.string().transform((val) => Math.min(parseInt(val) || 20, 100)).pipe(z.number().min(1).max(100)),
  seenTweetIds: z.string().optional().transform((val) => val ? val.split(',') : [])
});

export const statusFilterSchema = z.object({
  status: z.enum(['pending', 'posting', 'posted', 'failed', 'rejected']).optional()
});

// Path parameter schemas
export const agentIdParamSchema = z.object({
  id: uuidSchema
});

export const replyIdParamSchema = z.object({
  id: uuidSchema,
  replyId: uuidSchema
});

export const tweetIdParamSchema = z.object({
  tweetId: z.string().min(1, 'Tweet ID is required')
});

// Webhook schemas
export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any()
  }),
  id: z.string(),
  created: z.number()
});

// Admin schemas
export const adminUpdatePlansSchema = z.object({
  // Add admin-specific validation as needed
});

// Helper function to validate path parameters
export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: any
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Invalid parameters' };
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Invalid query parameters' };
  }
} 