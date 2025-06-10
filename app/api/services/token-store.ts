import prisma from '@/app/db/utils/dbClient';
import crypto from 'crypto';

// Color utility for better log organization
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bright: '\x1b[1m'
};

// Logging utility
const logger = {
  // Regular informational logs - only shown in development
  debug: (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.dim}[TokenStore]${colors.reset} ${message}`);
    }
  },
  // Important lifecycle events
  info: (message: string) => {
    console.log(`${colors.magenta}[TokenStore]${colors.reset} ${message}`);
  },
  // Success messages
  success: (message: string) => {
    console.log(`${colors.green}[TokenStore]${colors.reset} ${message}`);
  },
  // Warning but not critical errors
  warn: (message: string) => {
    console.warn(`${colors.yellow}[TokenStore]${colors.reset} ${message}`);
  },
  // Critical errors
  error: (message: string, error?: any) => {
    console.error(
      `${colors.red}[TokenStore]${colors.reset} ${message}`, 
      error ? error : ''
    );
  }
};

// Implement encryption/decryption using Node.js crypto module
// Using AES-256-CBC encryption

// The encryption key should ideally be in an environment variable
// For production, use a securely stored environment variable
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-key-please-change-in-production-env'; 

// Check if using the default key and warn if in production
if (ENCRYPTION_KEY === 'default-key-please-change-in-production-env' && process.env.NODE_ENV === 'production') {
  logger.error('SECURITY RISK: Using default encryption key in production environment!');
  logger.error('Set the TOKEN_ENCRYPTION_KEY environment variable to a secure random value');
}

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Create a secure key from the provided string
const getSecureKey = () => {
  // Create a 32-byte key (256 bits) using SHA-256 hash of the encryption key
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
};

// Cache for encryption key to avoid repeated hashing
let cachedSecureKey: Buffer | null = null;
const getCachedSecureKey = () => {
  if (!cachedSecureKey) {
    cachedSecureKey = getSecureKey();
  }
  return cachedSecureKey;
};

/**
 * Encrypts text using AES-256-CBC
 * @param text The string to encrypt
 * @returns The encrypted text as a base64 string with IV prepended
 */
const encrypt = (text: string): string => {
  if (!text) {
    logger.warn('Attempted to encrypt empty or null text');
    return '';
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Use cached key for better performance
    const key = getCachedSecureKey();
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Prepend the IV to the encrypted data (we'll need it for decryption)
    // Convert IV to base64 and combine with encrypted data
    const ivString = iv.toString('base64');
    
    // Return combined IV and encrypted data
    return `${ivString}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed:', error);
    // In case of failure, log but don't expose error details in returned data
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Decrypts text using AES-256-CBC
 * @param encryptedText The encrypted text with IV prepended as base64
 * @returns The decrypted text
 */
const decrypt = (encryptedText: string): string => {
  if (!encryptedText) {
    logger.warn('Attempted to decrypt empty or null text');
    return '';
  }

  try {
    // Check if the encryptedText follows the expected format (has IV prepended)
    if (!encryptedText.includes(':')) {
      // If not in the expected format, this might be plaintext or data encrypted with an old method
      logger.warn('Detected potential plaintext or legacy encrypted data');
      return encryptedText; // Return as is for backward compatibility
    }
    // Split the IV from the encrypted data
    const [ivString, encryptedData] = encryptedText.split(':');
    
    if (!ivString || !encryptedData) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Convert IV from base64 to Buffer
    const iv = Buffer.from(ivString, 'base64');
    
    // Use cached key for better performance
    const key = getCachedSecureKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    // In case of failure with old data, handle gracefully
    if (error instanceof Error && error.message !== 'Invalid encrypted data format') {
      // If it's a plaintext (not following our format), return as is
      if (!encryptedText.includes(':')) {
        logger.warn('Attempting to decrypt possible plaintext data. Returning as is.');
        return encryptedText;
      }
    }
    throw new Error('Failed to decrypt sensitive data');
  }
};

// Use the shared Prisma client (already imported above)

// Simple in-memory cache for temporary tokens (TTL: 10 minutes)
const tempTokenCache = new Map<string, { secret: string; timestamp: number }>();
const TEMP_TOKEN_TTL = 10 * 60 * 1000; // 10 minutes

// Clean expired tokens from cache
const cleanExpiredTokens = () => {
  const now = Date.now();
  for (const [token, data] of tempTokenCache.entries()) {
    if (now - data.timestamp > TEMP_TOKEN_TTL) {
      tempTokenCache.delete(token);
    }
  }
};

// Clean cache every 5 minutes
setInterval(cleanExpiredTokens, 5 * 60 * 1000);

export const tokenStore = {
  /**
   * Stores the temporary OAuth token secret received during the initiate step.
   * Creates or updates the TwitterAuth record for the agent.
   */
  async saveTemporarySecret(
    agentId: string, 
    oauthToken: string, 
    oauthTokenSecret: string
  ): Promise<void> {
    const encryptedSecret = encrypt(oauthTokenSecret);
    
    // Cache the temporary token for faster retrieval
    tempTokenCache.set(oauthToken, {
      secret: oauthTokenSecret,
      timestamp: Date.now()
    });
    
    // Use upsert: Create if not exists, update if exists
    await prisma.twitterAuth.upsert({
      where: { agentId: agentId },
      create: {
        agentId: agentId,
        tempOauthToken: oauthToken,
        tempOauthTokenSecret: encryptedSecret,
      },
      update: {
        tempOauthToken: oauthToken,
        tempOauthTokenSecret: encryptedSecret,
        // Clear potentially stale permanent tokens if re-authenticating
        accessToken: null,
        accessSecret: null,
        twitterUserId: null,
        twitterScreenName: null,
      },
    });
    logger.info(`Saved temp secret for agent: ${colors.cyan}${agentId}${colors.reset}, token: ${oauthToken.substring(0, 5)}...`);
  },

  /**
   * Retrieves the temporary OAuth token secret using the OAuth token.
   * Optimized with in-memory cache for frequently accessed tokens.
   */
  async getTemporarySecret(oauthToken: string): Promise<string | null> {
    logger.debug(`Getting temp secret for token: ${oauthToken.substring(0, 5)}...`);
    
    // Check cache first
    const cached = tempTokenCache.get(oauthToken);
    if (cached && (Date.now() - cached.timestamp < TEMP_TOKEN_TTL)) {
      logger.debug('Retrieved temp secret from cache');
      return cached.secret;
    }
    
    // Fallback to database
    const authRecord = await prisma.twitterAuth.findFirst({
      where: { tempOauthToken: oauthToken },
      select: { tempOauthTokenSecret: true },
    });

    if (authRecord?.tempOauthTokenSecret) {
      try {
        const decryptedSecret = decrypt(authRecord.tempOauthTokenSecret);
        // Update cache
        tempTokenCache.set(oauthToken, {
          secret: decryptedSecret,
          timestamp: Date.now()
        });
        return decryptedSecret;
      } catch (error) {
        logger.error(`Failed to decrypt temporary secret for token: ${oauthToken.substring(0, 5)}...`);
        return null;
      }
    }
    logger.warn(`Temp secret not found for token: ${oauthToken.substring(0, 5)}...`);
    return null;
  },

  /**
   * Saves the permanent access tokens and user info after successful OAuth callback.
   * Clears the temporary tokens and cache.
   */
  async savePermanentTokens(
    agentId: string,
    accessToken: string,
    accessSecret: string,
    twitterUserId: string,
    twitterScreenName: string
  ): Promise<void> {
    logger.info(`Saving permanent tokens for agent: ${colors.cyan}${agentId}${colors.reset}, user: ${colors.bright}@${twitterScreenName}${colors.reset}`);
    
    try {
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedAccessSecret = encrypt(accessSecret);

      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        const updatedAuth = await tx.twitterAuth.update({
          where: { agentId: agentId },
          data: {
            accessToken: encryptedAccessToken,
            accessSecret: encryptedAccessSecret,
            twitterUserId: twitterUserId,
            twitterScreenName: twitterScreenName,
            // Clear temporary fields now that we have permanent ones
            tempOauthToken: null,
            tempOauthTokenSecret: null,
          },
          select: { tempOauthToken: true }
        });
        
        // Clear from cache if it exists
        if (updatedAuth.tempOauthToken) {
          tempTokenCache.delete(updatedAuth.tempOauthToken);
        }
      });
      
      logger.success(`Tokens securely stored for Twitter account @${twitterScreenName}`);
    } catch (error) {
      logger.error(`Failed to save permanent tokens for agent ${agentId}:`, error);
      throw error; // Re-throw to let the caller handle it
    }
  },

  /**
   * Retrieves the permanent access tokens for a given agent.
   * Needed when the agent needs to make authenticated Twitter API calls.
   */
  async getPermanentTokens(agentId: string): Promise<{ accessToken: string; accessSecret: string } | null> {
    logger.debug(`Getting permanent tokens for agent: ${agentId}`);
    const authRecord = await prisma.twitterAuth.findUnique({
      where: { agentId: agentId },
      select: { accessToken: true, accessSecret: true },
    });

    if (authRecord?.accessToken && authRecord?.accessSecret) {
      try {
        return {
          accessToken: decrypt(authRecord.accessToken),
          accessSecret: decrypt(authRecord.accessSecret),
        };
      } catch (error) {
        logger.error(`Failed to decrypt tokens for agent ${agentId}:`, error);
        return null;
      }
    }
    logger.warn(`Permanent tokens not found for agent: ${agentId}`);
    return null;
  },

  /**
   * Clears temporary tokens, typically called if the OAuth flow fails or expires.
   * Note: savePermanentTokens already clears them on success.
   * Uses updateMany which does not error if the record doesn't exist.
   */
  async clearTemporaryTokensByAgent(agentId: string): Promise<void> {
    logger.debug(`Clearing temp tokens for agent: ${agentId} (if record exists)`);
    
    // Get the temp token first to clear from cache
    const authRecord = await prisma.twitterAuth.findUnique({
      where: { agentId },
      select: { tempOauthToken: true }
    });
    
    // Clear from cache if exists
    if (authRecord?.tempOauthToken) {
      tempTokenCache.delete(authRecord.tempOauthToken);
    }
    
    // Use updateMany - it affects 0 records if the agentId doesn't match, without throwing P2025
    await prisma.twitterAuth.updateMany({ 
      where: { agentId: agentId },
      data: {
        tempOauthToken: null,
        tempOauthTokenSecret: null,
      },
    });
  },
  
   /**
   * Deletes the TwitterAuth record for an agent, e.g., when disconnecting.
   */
  async deleteTokens(agentId: string): Promise<void> {
    logger.info(`Deleting all tokens for agent: ${colors.cyan}${agentId}${colors.reset}`);
    
    try {
      // Get the temp token first to clear from cache
      const authRecord = await prisma.twitterAuth.findUnique({
        where: { agentId },
        select: { tempOauthToken: true }
      });
      
      // Clear from cache if exists
      if (authRecord?.tempOauthToken) {
        tempTokenCache.delete(authRecord.tempOauthToken);
      }
      
      await prisma.twitterAuth.delete({
        where: { agentId: agentId },
      });
    } catch (error: any) {
      // Handle case where record might not exist gracefully
      if (error.code !== 'P2025') { // P2025 = Record to delete not found
        logger.error(`Error deleting tokens for agent ${agentId}:`, error);
        throw error; // Re-throw unexpected errors
      }
      logger.warn(`No tokens found to delete for agent: ${agentId}`);
    }
  }
}; 