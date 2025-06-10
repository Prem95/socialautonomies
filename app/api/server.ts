/**
 * API Server
 * 
 * Express server for the X Agent API
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { agentManagerService } from '../db/services';
import tweetRoutes from './routes/tweet-routes';
import twitterRoutes from './routes/twitter-routes';
import agentTweetRoutes from './routes/agent-tweet-routes';
import { handleBigIntSerialization } from './middleware/serialization';
import { ensureUserProfile } from './middleware/profile-middleware';
import { extractUserId } from './middleware/user-middleware';
import { schedulerService } from './scheduler-service';
import prisma from '@/app/db/utils/dbClient';

// Use a simple color utility without external dependencies
const color = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`
};

// Using shared Prisma client imported above

// Now read env vars (they should be loaded)
const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const expressServerUrlCheck = process.env.EXPRESS_SERVER_URL || "http://localhost:3001"

// Simplified colored logging
const log = {
  info: (message: string) => console.log(color.blue(`ℹ️  ${message}`)),
  success: (message: string) => console.log(color.green(`✅ ${message}`)),
  warn: (message: string) => console.log(color.yellow(`⚠️  ${message}`)),
  error: (message: string) => console.error(color.red(`❌ ${message}`)),
  config: (message: string) => console.log(color.cyan(`🔧 ${message}`)),
  route: (message: string) => console.log(color.yellow(`🛣️  ${message}`)),
  api: (message: string) => console.log(color.cyan(`🔌 ${message}`))
};

// Only log URLs in development mode or when starting up
if (process.env.NODE_ENV !== 'production') {
  log.config(`Express server URL: ${expressServerUrlCheck}`);
  log.config(`Frontend URL: ${frontendUrl}`);
}

// Check for critical configuration
if (!expressServerUrlCheck) {
  log.error("EXPRESS_SERVER_URL is not defined.");
  // process.exit(1); // Consider exiting if critical config is missing
}

// Create Express server
const app = express();

// Middleware
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
app.use(helmet());
// Use morgan only in development mode
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json());

// Apply custom middleware
app.use(handleBigIntSerialization);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Log API initialization
log.api('Initializing API routes...');
log.route('Health Check: /health');
log.route('Twitter OAuth: /api/twitter/oauth/*');

// Authentication middleware
app.use(extractUserId as (req: Request, res: Response, next: NextFunction) => void);
app.use(ensureUserProfile as (req: Request, res: Response, next: NextFunction) => void);

// // Routes
// log.route('Agent Management: /api/agents/*');
// app.use('/api/agents', agentRoutes);

log.route('Tweet Management: /api/tweets/*');
app.use('/api/tweets', tweetRoutes);

log.route('Twitter Integration: /api/twitter/*');
app.use('/api/twitter', twitterRoutes);

log.route('Agent Tweets: /api/agent-tweets/*');
app.use('/api/agent-tweets', agentTweetRoutes);

log.route('Tweet Generation: /api/agents/:id/generate-tweet');
app.use('/api/agents/:id/generate-tweet', agentTweetRoutes);

log.route('Tweet Scheduling: /api/agents/:id/schedule-tweet');
app.use('/api/agents/:id/schedule-tweet', agentTweetRoutes);

// Log specific auto-engage routes
log.api('🤖 Auto-Engage Service Routes:');
log.route('  Auto-Engage Config: /api/agents/:id/auto-engage');
log.route('  Auto-Engage Analytics: /api/agents/:id/auto-engage/analytics');  
log.route('  Reply Management: /api/agents/:id/replies');
log.route('  Manual Cycle Trigger: POST /api/agents/:id/replies');

log.api('✅ All API routes initialized successfully');

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  log.error(`Unhandled error: ${err?.message || 'Unknown error'}`);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Initialize and start the server
 */
export async function startServer() {
  try {
    log.api('🚀 Initializing server services...');
    
    log.api('Starting Agent Manager Service...');
    await agentManagerService.initialize();
    log.success('Agent Manager Service initialized');
    
    // 🚀 Start heartbeat batching service
    log.api('Starting Heartbeat Batching Service...');
    await agentManagerService.startWorkerMonitoring();
    log.success('Heartbeat Batching Service initialized (30s batching, 90s monitoring)');
    
    // Set up monitoring with minimal logging and proper cleanup tracking
    let monitorInterval: NodeJS.Timeout | null = null;
    monitorInterval = setInterval(() => {
      agentManagerService.monitorWorkers()
        .catch(err => log.error(`Worker monitoring error: ${err.message}`));
    }, 60000);
    
    // Initialize the tweet scheduler
    log.api('Starting Scheduler Service...');
    schedulerService.initialize(1); // Check every 1 minute
    log.success('Scheduler Service initialized');
    log.api('📅 Scheduler handles:');
    log.route('  ⏰ Auto-Tweet cycles (every X hours)');
    log.route('  🤖 Auto-Engage cycles (every X hours)');
    log.route('  📊 Agent monitoring and cleanup');
    
    return new Promise<void>(resolve => {
      const server = app.listen(PORT, () => {
        // Simplified startup logs with colors
        log.success(`API Server running on port ${PORT}`);
        log.info(`Health check: http://localhost:${PORT}/health`);
        
        // Only show these in development mode
        if (process.env.NODE_ENV !== 'production') {
          log.config(`Frontend URL: ${frontendUrl}`);
          log.config(`Twitter Callback URL: ${expressServerUrlCheck}/api/twitter/oauth/callback`);
        }
        
        resolve();
      });
      
      // Set up graceful shutdown handlers
      const cleanup = () => {
        log.info('Shutting down gracefully...');
        server.close(async () => {
          if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
            log.info('Monitoring interval cleaned up');
          }
          
          // 🚀 Stop heartbeat batching service
          await agentManagerService.stopWorkerMonitoring();
          log.info('Heartbeat batching service stopped');
          
          await prisma.$disconnect();
          log.success('Server shutdown complete');
          process.exit(0);
        });
      };
      
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
      process.on('exit', cleanup);
    });
  } catch (error) {
    log.error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}