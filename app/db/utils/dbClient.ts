import { PrismaClient } from '@prisma/client';

// Create a global instance of PrismaClient to avoid multiple instances during hot-reloading in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Controls whether Prisma should log queries (disabled for cleaner logs)
const enablePrismaQueryLogging = process.env.DEBUG_PRISMA_QUERIES === 'true';

// 🚀 OPTIMIZED PRISMA CLIENT WITH CONNECTION POOLING
// Initialize PrismaClient with performance optimizations
const prisma = global.prisma || new PrismaClient({
  log: enablePrismaQueryLogging 
    ? ['query', 'error', 'warn'] 
    : [], // No logs unless explicitly enabled
  
  // 📊 ERROR HANDLING & LOGGING OPTIMIZATIONS
  errorFormat: 'minimal', // Reduce error message size
  
  // 🔧 QUERY OPTIMIZATIONS
  transactionOptions: {
    maxWait: 5000,      // 5 seconds max wait for transaction
    timeout: 10000,     // 10 seconds transaction timeout
    isolationLevel: 'ReadCommitted' // Faster than default Serializable
  },
  
  // 🚀 CONNECTION POOL OPTIMIZATIONS
  // These are applied via environment variables but documented here
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// 🚀 SCHEDULER-SPECIFIC QUERY OPTIMIZATIONS
// Pre-compile common queries used by scheduler for better performance
const schedulerQueries = {
  // Optimized query for auto-tweet agents
  findAutoTweetAgents: () => prisma.agent.findMany({
    where: {
      status: 'running',
      autoTweetEnabled: true,
      autoTweetFrequencyHours: { not: null },
      autoTweetCount: { gt: 0 }
    },
    select: {
      agentId: true,
      userId: true,
      name: true,
      autoTweetFrequencyHours: true,
      autoTweetCount: true,
      lastAutoTweetTime: true
    }
  }),
  
  // Optimized query for auto-engage agents  
  findAutoEngageAgents: () => prisma.agent.findMany({
    where: {
      status: 'running',
      autoEngageEnabled: true,
      autoEngageFrequencyHours: { not: null },
      autoEngageMaxReplies: { gt: 0 }
    },
    select: {
      agentId: true,
      userId: true,
      name: true,
      autoEngageFrequencyHours: true,
      autoEngageMaxReplies: true,
      lastAutoEngageTime: true,
      profile: {
        select: { userId: true }
      }
    }
  }),
  
  // Optimized query for scheduled tweets
  findScheduledTweets: () => prisma.tweet.findMany({
    where: {
      status: 'scheduled',
      postTime: { lte: new Date() }
    },
    select: {
      tweetId: true,
      agentId: true,
      text: true,
      postTime: true,
      agent: {
        select: {
          userId: true,
          status: true,
          name: true
        }
      }
    },
    orderBy: { postTime: 'asc' } // Process oldest first
  }),
  
  // Optimized query for valid cookies
  findValidCookies: (userId: string) => prisma.cookie.findMany({
    where: {
      userId,
      OR: [
        { expires: null },
        { expires: { gt: new Date() } }
      ]
    },
    select: {
      key: true,
      value: true,
      domain: true,
      path: true,
      secure: true,
      httpOnly: true,
      sameSite: true
    }
  })
};

// 🔄 CONNECTION POOL MONITORING
let connectionCount = 0;

// Add connection lifecycle hooks for monitoring (disabled for cleaner logs)
// prisma.$on('query', (e) => {
//   if (enablePrismaQueryLogging) {
//     console.log(`[DB] Query: ${e.query.substring(0, 100)}... (${e.duration}ms)`);
//   }
// });

// 🧹 CONNECTION POOL CLEANUP
const cleanupConnection = async () => {
  try {
    await prisma.$disconnect();
    console.log('[DB] Connection pool cleaned up');
  } catch (error) {
    console.error('[DB] Error during cleanup:', error);
  }
};

// In development mode, attach PrismaClient to global object to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

// 🚀 ENHANCED EXPORT WITH OPTIMIZED QUERIES
export default prisma;
export { schedulerQueries, cleanupConnection }; 