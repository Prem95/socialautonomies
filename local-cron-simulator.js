#!/usr/bin/env node

// Load environment variables from .env files
require('dotenv').config();

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Local Cron Simulator
 * Simulates Vercel cron jobs for local development testing
 */

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

// Enhanced logging utility with file output
class CronLogger {
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  formatLogEntry(level, message, metadata = null) {
    const timestamp = new Date().toISOString();
    const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [cron] ${message}${metadataStr}\n`;
  }

  writeToFile(level, message, metadata = null) {
    try {
      const logEntry = this.formatLogEntry(level, message, metadata);
      
      // Write to cron-specific log
      const cronLogFile = path.join(this.logsDir, 'cron.log');
      fs.appendFileSync(cronLogFile, logEntry);
      
      // Write to combined log
      const combinedLogFile = path.join(this.logsDir, 'combined.log');
      fs.appendFileSync(combinedLogFile, logEntry);
      
      // Error logs also go to error-specific file
      if (level === 'error') {
        const errorLogFile = path.join(this.logsDir, 'error.log');
        fs.appendFileSync(errorLogFile, logEntry);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, metadata = null) {
    // Write to file
    this.writeToFile(level, message, metadata);
    
    // Console output with colors (for development)
    const colorMap = {
      debug: colors.dim,
      info: colors.cyan,
      warn: colors.yellow,
      error: colors.red,
      success: colors.green
    };
    
    const color = colorMap[level] || colors.reset;
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${color}[Cron] ${message}${metadataStr}${colors.reset}`);
    }
  }

  info(message, metadata) { this.log('info', message, metadata); }
  success(message, metadata) { this.log('success', message, metadata); }
  warn(message, metadata) { this.log('warn', message, metadata); }
  error(message, metadata) { this.log('error', message, metadata); }
  debug(message, metadata) { this.log('debug', message, metadata); }
}

const logger = new CronLogger();

// State persistence
const STATE_FILE = path.join(__dirname, 'cron-state.json');

// Load state from file
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      logger.info('Loaded previous cron state');
      return state;
    }
  } catch (error) {
    logger.warn('Could not load previous state, starting fresh');
  }
  return {};
}

// Save state to file
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    logger.error(`Failed to save state: ${error.message}`);
  }
}

// Cron job definitions (matching vercel.json)
const cronJobs = [
  {
    name: 'Scheduled Tweets',
    path: '/api/cron/scheduled-tweets',
    schedule: '* * * * *', // Every minute
    intervalMs: 60 * 1000
  },
  {
    name: 'Auto Tweets',
    path: '/api/cron/auto-tweets',
    schedule: '*/30 * * * *', // Every 30 minutes
    intervalMs: 30 * 60 * 1000
  },
  {
    name: 'Auto Engage',
    path: '/api/cron/auto-engage', 
    schedule: '*/5 * * * *', // Every 5 minutes
    intervalMs: 5 * 60 * 1000
  }
];

// Track last run times and intervals
let lastRuns = {};
let activeIntervals = {};
let gracefulShutdown = false;

// Load previous state
const savedState = loadState();
lastRuns = savedState.lastRuns || {};

function shouldRun(job) {
  const now = Date.now();
  const lastRun = lastRuns[job.name] || 0;
  
  return (now - lastRun) >= job.intervalMs;
}

async function runJob(job) {
  if (gracefulShutdown) return;
  
  try {
    logger.info(`Running ${job.name}...`);
    
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseURL}${job.path}`;
    const cronSecret = process.env.CRON_SECRET;
    const nodeEnv = process.env.NODE_ENV;
    
    // Enhanced logging for debugging
    logger.debug(`Environment: NODE_ENV=${nodeEnv}`);
    logger.debug(`Base URL: ${baseURL}`);
    logger.debug(`CRON_SECRET present: ${cronSecret ? 'YES' : 'NO'}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
    
    // Build headers with detailed logging
    const headers = {
      'User-Agent': 'Local-Cron-Simulator',
      'Content-Type': 'application/json'
    };
    
    // Add authorization header if CRON_SECRET exists
    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`;
      logger.debug(`Adding Authorization header with Bearer token`);
    } else {
      logger.warn(`No CRON_SECRET found - requests may be unauthorized in production`);
    }
    
    logger.debug(`Request headers: ${JSON.stringify(Object.keys(headers))}`);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const result = await response.json();
      logger.success(`${job.name} completed successfully`, {
        status: response.status,
        responseSize: JSON.stringify(result).length
      });
      logger.debug(`Response: ${JSON.stringify(result, null, 2)}`);
      
      // Update last run time only on success
      lastRuns[job.name] = Date.now();
      saveState({ lastRuns, timestamp: new Date().toISOString() });
      
    } else {
      const errorText = await response.text();
      logger.error(`${job.name} failed with status ${response.status}`, {
        url,
        status: response.status,
        hasAuth: !!cronSecret,
        environment: nodeEnv,
        response: errorText
      });
      
      // Specific handling for 401 errors
      if (response.status === 401) {
        if (!cronSecret) {
          logger.error(`401 Unauthorized: Missing CRON_SECRET environment variable`);
          logger.info(`Generate a secret with: npm run debug:cron generate`);
        } else {
          logger.error(`401 Unauthorized: CRON_SECRET may be incorrect or not matching server`);
        }
      }
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`${job.name} timed out after 25 seconds`);
    } else {
      logger.error(`${job.name} failed: ${error.message}`, {
        errorName: error.name,
        stack: error.stack
      });
    }
  }
}

function startCronSimulator() {
  logger.info('🚀 Starting Local Cron Simulator...');
  logger.info(`Monitoring ${cronJobs.length} cron jobs:`);
  
  cronJobs.forEach(job => {
    logger.info(`  📅 ${job.name}: ${job.schedule}`);
  });
  
  // Main scheduler loop
  const schedulerInterval = setInterval(async () => {
    if (gracefulShutdown) return;
    
    for (const job of cronJobs) {
      if (shouldRun(job)) {
        // Run job without waiting to prevent blocking
        runJob(job).catch(error => {
          logger.error(`Unexpected error in ${job.name}: ${error.message}`);
        });
      }
    }
  }, 10000); // Check every 10 seconds
  
  activeIntervals.scheduler = schedulerInterval;
  
  logger.success('Local Cron Simulator started successfully');
  
  // Health check endpoint simulation
  const healthCheckInterval = setInterval(() => {
    if (!gracefulShutdown) {
      logger.debug('Cron simulator health check - OK');
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  activeIntervals.healthCheck = healthCheckInterval;
}

// Graceful shutdown handling
function gracefulShutdownHandler(signal) {
  logger.warn(`Received ${signal}, initiating graceful shutdown...`);
  gracefulShutdown = true;
  
  // Clear all intervals
  Object.values(activeIntervals).forEach(interval => {
    if (interval) clearInterval(interval);
  });
  
  // Save final state
  saveState({ 
    lastRuns, 
    timestamp: new Date().toISOString(),
    shutdownReason: signal 
  });
  
  logger.info('Cron simulator shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdownHandler('SIGTERM'));
process.on('SIGINT', () => gracefulShutdownHandler('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdownHandler('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  gracefulShutdownHandler('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at ${promise}: ${reason}`);
});

// Check if running directly
if (require.main === module) {
  startCronSimulator();
}