/**
 * Agent Manager Service
 * 
 * Manages agent deployment, worker processes, and lifecycle.
 */

import { Agent, AgentStatus, WorkerStatus } from '@prisma/client';
import { agentService } from './agentService';
import { profileService } from './profileService';
import { exec, spawn, ChildProcess } from 'child_process';
import path from 'path';
import prisma from '../utils/dbClient';
import { DatabaseError } from '../utils/errorHandler';
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
      console.log(`${colors.dim}[AgentManager]${colors.reset} ${message}`);
    }
  },
  // Important lifecycle events
  info: (message: string) => {
    console.log(`${colors.blue}[AgentManager]${colors.reset} ${message}`);
  },
  // Success messages
  success: (message: string) => {
    console.log(`${colors.green}[AgentManager]${colors.reset} ${message}`);
  },
  // Warning but not critical errors
  warn: (message: string) => {
    console.warn(`${colors.yellow}[AgentManager]${colors.reset} ${message}`);
  },
  // Critical errors
  error: (message: string, error?: any) => {
    console.error(
      `${colors.red}[AgentManager]${colors.reset} ${message}`, 
      error ? error : ''
    );
  }
};

// Map of active worker processes by agentId
const activeWorkers: Map<string, ChildProcess> = new Map();

// Store cleanup functions for intervals
let monitoringInterval: NodeJS.Timeout | null = null;

// 🚀 HEARTBEAT TIMEOUT CONFIGURATION
const HEARTBEAT_TIMEOUT = 120000; // 2 minutes in milliseconds

// 🚀 HEARTBEAT BATCHING OPTIMIZATION
// Batch heartbeat updates to reduce database load
const heartbeatBatch: Map<string, Date> = new Map();
let heartbeatBatchInterval: NodeJS.Timeout | null = null;

// Define Worker Status strings explicitly for raw queries if needed, 
// although casting with ::"WorkerStatus" should work for Postgres enums.
const WorkerStatusString = {
    INITIALIZING: 'INITIALIZING',
    RUNNING: 'RUNNING',
    STOPPING: 'STOPPING',
    STOPPED: 'STOPPED',
    ERROR: 'ERROR',
};

/**
 * Agent Manager Service
 */
export const agentManagerService = {
  /**
   * Deploy an agent (start worker process)
   */
  async deployAgent(userId: string, agentId: string): Promise<Agent> {
    logger.info(`Deploying worker for agent ${colors.cyan}${agentId}${colors.reset}`);
    try {
      // Get agent and verify ownership
      const agent = await prisma.agent.findUnique({
        where: { agentId }
      });
      
      if (!agent) {
        throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
      }
      
      if (agent.userId !== userId) {
        throw new DatabaseError('You do not have permission to deploy this agent', 'PERMISSION_DENIED');
      }
      
      // Check if agent is already running
      if (agent.status === AgentStatus.running) { // Use Enum
        throw new DatabaseError('Agent is already running', 'AGENT_ALREADY_RUNNING');
      }
      
      // Check if user has reached the agent limit
      const profile = await profileService.getProfileWithPlan(userId);
      if (!profile?.planId) { // Added null check for profile
        throw new DatabaseError('User profile or plan not found', 'PLAN_REQUIRED');
      }
      
      const runningAgents = await this.getRunningAgentCount(userId);
      const maxAgents = profile.plan?.maxAgents || 0; // Max agents from plan
      
      if (runningAgents >= maxAgents) {
        throw new DatabaseError(
          `Running agent limit reached: ${runningAgents}/${maxAgents}. Upgrade plan to run more agents simultaneously.`,
          'LIMIT_REACHED'
        );
      }
      
      // Generate a UUID for the worker
      const workerId = crypto.randomUUID();
      
      // Create the worker record using Prisma Client API for type safety
      logger.debug(`Creating worker record for workerId: ${workerId}`);
      const worker = await prisma.agentWorker.create({
          data: {
              workerId: workerId,
              agentId: agentId,
              status: WorkerStatus.INITIALIZING, // Use Enum
              startedAt: new Date(),
              config: agent.brand || {} // Use agent brand as initial config? Or empty?
          }
      });
      
      // Start the worker process
      const workerProcess = await this.startWorkerProcess(agent, worker.workerId); // Pass the created workerId
      
      // Store the worker process in memory
      activeWorkers.set(agentId, workerProcess);
      logger.debug(`Worker process started for agent ${agentId}`);
      
      // Update agent status using agentService for consistency
      const updatedAgent = await agentService.updateAgent(agentId, {
        status: AgentStatus.running, // Use Enum
        startTime: new Date()
      });
      logger.success(`Agent ${colors.cyan}${agentId}${colors.reset} deployed and running`);
      
      return updatedAgent;
    } catch (error) {
      logger.error(`Failed to deploy agent ${agentId}:`, error);
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to deploy agent: ${error instanceof Error ? error.message : String(error)}`, 'DEPLOYMENT_FAILED');
    }
  },
  
  /**
   * Stop a running agent worker process and update status
   */
  async stopAgent(userId: string, agentId: string): Promise<Agent> {
    logger.info(`Stopping agent ${colors.cyan}${agentId}${colors.reset}`);
    try {
      // Get agent to verify ownership before proceeding
      const agent = await prisma.agent.findUnique({
        where: { agentId }
      });
      
      if (!agent) {
        throw new DatabaseError(`Agent with ID ${agentId} not found`, 'RECORD_NOT_FOUND');
      }
      
      // Verify ownership
      if (agent.userId !== userId) {
        throw new DatabaseError('You do not have permission to stop this agent', 'PERMISSION_DENIED');
      }
      
      // Check current status
      if (agent.status !== AgentStatus.running && agent.status !== AgentStatus.error) {
        logger.warn(`Agent ${agentId} status is ${agent.status}. Proceeding with stop/cleanup anyway.`);
      }
      
      // Get the active worker process from memory map
      const workerProcess = activeWorkers.get(agentId);
      
      // Update worker record(s) to 'STOPPING' state first using Prisma Client API
      logger.debug(`Setting workers for agent ${agentId} to STOPPING status`);
      await prisma.agentWorker.updateMany({
          where: { 
              agentId: agentId, 
              // Only target workers that might be running or initializing
              status: { in: [WorkerStatus.RUNNING, WorkerStatus.INITIALIZING] } 
          },
          data: { 
              status: WorkerStatus.STOPPING // Use Enum
          }
      });

      // Attempt to gracefully kill the process if it exists in our map
      if (workerProcess && !workerProcess.killed) {
        logger.debug(`Sending SIGTERM to worker process for agent ${agentId}`);
        workerProcess.kill('SIGTERM'); // Try gentle shutdown first
        
        // Set a timeout to forcefully kill if it doesn't exit
        const killTimeout = setTimeout(() => {
          if (activeWorkers.has(agentId) && !workerProcess.killed) {
            logger.warn(`Worker process for agent ${agentId} did not exit gracefully. Forcing termination.`);
            workerProcess.kill('SIGKILL'); // Force kill
            activeWorkers.delete(agentId); // Clean up map entry after force kill
            prisma.agentWorker.updateMany({
                where: { agentId: agentId, status: WorkerStatus.STOPPING },
                data: { status: WorkerStatus.STOPPED, stoppedAt: new Date(), error: 'Force killed after timeout.' }
            }).catch(err => logger.error(`Error updating worker status after force kill for ${agentId}:`, err));
          }
        }, 5000); // 5 second grace period

        // Handle process exit event
        workerProcess.on('exit', (code, signal) => {
          clearTimeout(killTimeout); // Cancel the force kill timeout
          logger.debug(`Worker process for agent ${agentId} exited with code ${code}, signal ${signal}`);
          activeWorkers.delete(agentId); // Clean up map entry on successful exit
          // Update status to stopped on clean exit
          prisma.agentWorker.updateMany({
            where: { agentId: agentId, status: WorkerStatus.STOPPING }, // Only update those we marked for stopping
            data: { status: WorkerStatus.STOPPED, stoppedAt: new Date() }
          }).catch(err => logger.error(`Error updating worker status after exit for ${agentId}:`, err));
        });

        // Handle potential errors during kill/exit
         workerProcess.on('error', (err) => {
            clearTimeout(killTimeout);
            logger.error(`Error from worker process ${agentId}:`, err);
            activeWorkers.delete(agentId);
             prisma.agentWorker.updateMany({
                where: { agentId: agentId, status: WorkerStatus.STOPPING },
                data: { status: WorkerStatus.ERROR, stoppedAt: new Date(), error: `Worker process error: ${err.message}` }
            }).catch(updateErr => logger.error(`Error updating worker status after process error for ${agentId}:`, updateErr));
        });

      } else {
        logger.debug(`No active worker process found for agent ${agentId}. Cleaning up database records.`);
        // If no process in memory, directly update DB records from STOPPING/RUNNING/INITIALIZING to STOPPED
        await prisma.agentWorker.updateMany({
          where: {
            agentId: agentId,
            status: { in: [WorkerStatus.RUNNING, WorkerStatus.INITIALIZING, WorkerStatus.STOPPING] }
          },
          data: {
            status: WorkerStatus.STOPPED, // Use Enum
            stoppedAt: new Date()
          }
        });
      }
      
      // Clear any remaining scheduled tweets for this agent
      logger.debug(`Clearing scheduled tweets for agent ${agentId}`);
      const deleteResult = await prisma.tweet.deleteMany({
        where: {
          agentId: agentId,
          status: 'scheduled' // Assuming TweetStatus enum maps to this string in DB or use TweetStatus.scheduled
        }
      });
      
      // Only log if there were tweets deleted
      if (deleteResult.count > 0) {
        logger.debug(`Cleared ${deleteResult.count} scheduled tweet(s) for agent ${agentId}`);
      }
      
      // Update agent status only if it was running or in error
      let updatedAgent: Agent;
      if (agent.status === AgentStatus.running || agent.status === AgentStatus.error) {
         logger.debug(`Updating agent ${agentId} status to STOPPED`);
         updatedAgent = await agentService.updateAgent(agentId, {
           status: AgentStatus.stopped, // Use Enum
           endTime: new Date()
         });
      } else {
        // If agent wasn't running/error, just return the current agent state
        logger.debug(`Agent ${agentId} was already ${agent.status}. Returning current state.`);
        updatedAgent = agent;
      }
      
      logger.success(`Agent ${colors.cyan}${agentId}${colors.reset} stopped successfully`);
      return updatedAgent;
    } catch (error) {
      logger.error(`Error stopping agent ${agentId}:`, error);
      // Attempt to update agent status to 'error' if stop failed mid-process
      try {
        await agentService.updateAgent(agentId, {
            status: AgentStatus.error, // Use Enum
            endTime: new Date()
          });
      } catch (updateError) {
         logger.error(`Failed to update agent ${agentId} status to error after stop failure:`, updateError);
      }
      
      if (error instanceof DatabaseError) {
        throw error;
      }
       throw new DatabaseError(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`, 'STOP_FAILED');
    }
  },
  
  /**
   * Start the worker node process
   */
  async startWorkerProcess(agent: Agent, workerId: string): Promise<ChildProcess> {
    logger.debug(`Starting worker process for agent ${agent.agentId}, worker ${workerId}`);
    const rootDir = path.resolve(process.cwd());
    // Adjust path if TS source maps are used correctly in production build
    const workerPath = path.join(rootDir, 'dist', 'src', 'workers', 'agent', 'agent-worker.js'); 
    
    // Check if worker file exists
    // Consider adding fs.existsSync(workerPath) check here for debugging

    const env = {
      ...process.env, // Pass existing env vars
      AGENT_ID: agent.agentId,
      WORKER_ID: workerId,
       // Pass relevant agent config if needed by worker
      // AGENT_NAME: agent.name, 
      // AGENT_GOAL: agent.goal,
       NODE_ENV: process.env.NODE_ENV || 'development' 
    };
    
    // Spawn the worker process
    const workerProcess = spawn('node', [workerPath], {
      env,
      detached: true, // Allows parent to exit independently
      stdio: 'ignore' // Or pipe/inherit for debugging: ['ignore', 'inherit', 'inherit']
    });
    
    // Optional: Add basic error handling for spawn itself
    workerProcess.on('error', (err) => {
        logger.error(`Failed to start worker process for agent ${agent.agentId}, worker ${workerId}:`, err);
        // Update worker status to ERROR in DB?
        prisma.agentWorker.update({
            where: { workerId },
            data: { status: WorkerStatus.ERROR, error: `Failed to spawn process: ${err.message}`, stoppedAt: new Date() }
        }).catch(dbErr => logger.error(`DB Error updating worker status after spawn fail:`, dbErr));
        activeWorkers.delete(agent.agentId); // Remove from map if spawn fails
    });

    workerProcess.unref(); // Allows parent to exit even if child is running

    logger.debug(`Worker process spawned for ${agent.agentId} with PID: ${workerProcess.pid}`);
    return workerProcess;
  },
  
  /**
   * Check all workers for dead/stalled processes and clean up
   */
  async monitorWorkers(): Promise<void> {
    try {
      const heartbeatThreshold = new Date();
      heartbeatThreshold.setMinutes(heartbeatThreshold.getMinutes() - 5); // 5 minute threshold
      
      // Only log detailed monitoring info in development mode
      logger.debug(`Monitoring workers older than ${heartbeatThreshold.toISOString()}`);

      // Find workers that are marked as running but haven't sent a recent heartbeat
      // Using Prisma Client API for better type safety and enum handling
      const stalledWorkers = await prisma.agentWorker.findMany({
        where: {
          status: WorkerStatus.RUNNING, // Use Enum
          lastHeartbeat: { lt: heartbeatThreshold }
        },
        include: { agent: true } // Include agent to get agentId easily
      });
      
      if (stalledWorkers.length > 0) {
          logger.warn(`Found ${stalledWorkers.length} potentially stalled workers`);
      } else {
          // Only log if in development mode
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`No stalled workers found`);
          }
          return;
      }

      // Clean up stalled workers
      for (const worker of stalledWorkers) {
        logger.warn(`Stalled worker ${worker.workerId} for agent ${worker.agentId}. Last heartbeat: ${worker.lastHeartbeat}`);
        
        // Clean up the worker process if it exists in our memory map
        const workerProcess = activeWorkers.get(worker.agentId);
        if (workerProcess && !workerProcess.killed) {
          logger.warn(`Force killing stalled worker process PID ${workerProcess.pid} for agent ${worker.agentId}`);
          workerProcess.kill('SIGKILL');
          activeWorkers.delete(worker.agentId); // Remove from map
        }
        
        // Update worker status in DB
        await prisma.agentWorker.update({
          where: { workerId: worker.workerId },
          data: { 
              status: WorkerStatus.ERROR, // Use Enum
              error: `Worker stalled - no heartbeat since ${worker.lastHeartbeat?.toISOString()}`,
              stoppedAt: new Date()
          }
        });
        
        // Update agent status to error
        await prisma.agent.update({
          where: { agentId: worker.agentId },
          data: {
            status: AgentStatus.error, // Use Enum
            endTime: new Date() // Mark agent end time
          }
        });
        logger.info(`Marked agent ${worker.agentId} and worker ${worker.workerId} as ERROR due to stall`);
      }
    } catch (error) {
      logger.error('Error monitoring workers:', error);
    }
  },
  
  /**
   * Get count of running agents for a user
   */
  async getRunningAgentCount(userId: string): Promise<number> {
    try {
      return await prisma.agent.count({
        where: {
          userId,
          status: AgentStatus.running // Use Enum
        }
      });
    } catch (error) {
      logger.error('Error getting running agent count:', error);
      // Don't mask the error, let it propagate or throw a DatabaseError
      throw new DatabaseError(`Failed to get running agent count: ${error instanceof Error ? error.message : String(error)}`, 'QUERY_FAILED');
    }
  },
  
  /**
   * Get status of all agents and their latest active worker for a user
   */
  async getAgentStatus(userId: string): Promise<any[]> {
    logger.debug(`Getting agent status for userId: ${userId}`);
    try {
        // Use Prisma Client API for type safety and easier joins
        const agentsWithWorkers = await prisma.agent.findMany({
            where: { userId },
            include: {
                // Get the most recently started worker for each agent
                workers: {
                    orderBy: { startedAt: 'desc' },
                    take: 1 
                },
                // Include TwitterAuth to get the screen name if available
                twitterAuth: true
            },
            orderBy: { name: 'asc' } // Example ordering
        });

        // Map the result to the desired format
        return agentsWithWorkers.map(agent => {
            const latestWorker = agent.workers[0]; // Get the worker (if exists)
            return {
                agentId: agent.agentId,
                name: agent.name,
                status: agent.status, // AgentStatus enum value
                startTime: agent.startTime,
                endTime: agent.endTime,
                twitterScreenName: agent.twitterAuth?.twitterScreenName, // Include associated X account from TwitterAuth
                worker: latestWorker ? {
                    workerId: latestWorker.workerId,
                    status: latestWorker.status, // WorkerStatus enum value
                    lastHeartbeat: latestWorker.lastHeartbeat,
                    startedAt: latestWorker.startedAt,
                    error: latestWorker.error // Include error message if any
                } : null
            };
        });

    } catch (error) {
        logger.error('Error getting agent status:', error);
        throw new DatabaseError(`Failed to get agent status: ${error instanceof Error ? error.message : String(error)}`, 'QUERY_FAILED');
    }
  },
  
  /**
   * Initialize agent manager on startup: Clean up potentially orphaned agents/workers
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`${colors.bright}Initializing Agent Manager Service${colors.reset}`);
      
      // Update agents that were left in 'running' state to 'error'
      const orphanedAgents = await prisma.agent.updateMany({
        where: { status: AgentStatus.running }, // Use Enum
        data: { 
          status: AgentStatus.error, // Use Enum
          endTime: new Date(), // Mark end time
          // Consider adding a note in a description field if you add one
        }
      });

      // Update worker records left in 'running' or 'initializing' or 'stopping' to 'ERROR'
      const orphanedWorkers = await prisma.agentWorker.updateMany({
        where: { 
            status: { in: [WorkerStatus.RUNNING, WorkerStatus.INITIALIZING, WorkerStatus.STOPPING] } // Use Enum
        },
        data: { 
            status: WorkerStatus.ERROR, // Use Enum
            error: 'Worker stopped unexpectedly due to server restart.',
            stoppedAt: new Date()
        }
      });

      
      // Set up periodic worker monitoring with cleanup tracking
      logger.info(`Setting up worker monitoring (every 1 minute)`);
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
      monitoringInterval = setInterval(() => this.monitorWorkers(), 60000); // Check every minute
      
      // Set up graceful shutdown handlers
      const cleanup = () => {
        if (monitoringInterval) {
          clearInterval(monitoringInterval);
          monitoringInterval = null;
          logger.info('Agent monitoring interval cleaned up');
        }
      };
      
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
      process.on('exit', cleanup);
      
      logger.success(`Agent Manager Service initialized successfully`);
    } catch (error) {
      logger.error('Critical error initializing agent manager:', error);
      // Depending on severity, you might want to prevent server start
      // throw error; 
    }
  },

  // 🚀 HEARTBEAT BATCHING FUNCTIONS
  /**
   * Queue a heartbeat update for batching (called by worker processes)
   */
  queueHeartbeat(workerId: string): void {
    heartbeatBatch.set(workerId, new Date());
    logger.debug(`Queued heartbeat for worker ${workerId} (batch size: ${heartbeatBatch.size})`);
  },

  /**
   * Process all queued heartbeat updates in a single database operation
   */
  async processHeartbeatBatch(): Promise<void> {
    if (heartbeatBatch.size === 0) return;

    const updates = Array.from(heartbeatBatch.entries());
    heartbeatBatch.clear(); // Clear the batch

    try {
      // 🚀 OPTIMIZED: Single transaction for all heartbeat updates
      await prisma.$transaction(async (tx) => {
        const updatePromises = updates.map(([workerId, timestamp]) =>
          tx.agentWorker.update({
            where: { workerId },
            data: { lastHeartbeat: timestamp },
          }).catch(err => {
            // Log individual failures but don't fail the entire batch
            logger.warn(`Failed to update heartbeat for worker ${workerId}:`, err);
          })
        );

        await Promise.allSettled(updatePromises);
      });

      logger.debug(`Processed ${updates.length} heartbeat updates in batch`);
    } catch (error) {
      logger.error('Error processing heartbeat batch:', error);
      // Re-queue failed updates for next batch
      updates.forEach(([workerId, timestamp]) => {
        heartbeatBatch.set(workerId, timestamp);
      });
    }
  },

  /**
   * Start heartbeat batching service
   */
  startHeartbeatBatching(): void {
    if (heartbeatBatchInterval) {
      clearInterval(heartbeatBatchInterval);
    }
    
    // Process heartbeat batch every 30 seconds
    heartbeatBatchInterval = setInterval(() => {
      this.processHeartbeatBatch();
    }, 30000);
    
    logger.info('Heartbeat batching service started (30-second intervals)');
  },

  /**
   * Stop heartbeat batching service
   */
  stopHeartbeatBatching(): void {
    if (heartbeatBatchInterval) {
      clearInterval(heartbeatBatchInterval);
      heartbeatBatchInterval = null;
      logger.info('Heartbeat batching service stopped');
    }
    
    // Process any remaining heartbeats
    this.processHeartbeatBatch();
  },

  /**
   * Start monitoring worker health
   */
  async startWorkerMonitoring(): Promise<void> {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    // 🚀 START HEARTBEAT BATCHING SERVICE
    this.startHeartbeatBatching();

    // Monitor every 90 seconds (reduced from 60s since heartbeats are batched every 30s)
    monitoringInterval = setInterval(async () => {
      try {
        // 🚀 OPTIMIZED: Single query to get all workers needing attention
        const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT);
        
        const workersNeedingAttention = await prisma.agentWorker.findMany({
          where: {
            OR: [
              // Workers with stale heartbeats
              {
                lastHeartbeat: {
                  lt: cutoffTime
                },
                status: {
                  in: ['RUNNING', 'INITIALIZING']
                }
              },
              // Workers marked as ERROR that need cleanup
              {
                status: 'ERROR'
              }
            ]
          },
          include: {
            agent: {
              select: {
                agentId: true,
                name: true,
                status: true
              }
            }
          }
        });

        logger.debug(`Found ${workersNeedingAttention.length} workers needing attention`);

        // Process each worker that needs attention
        for (const worker of workersNeedingAttention) {
          const activeWorkerProcess = activeWorkers.get(worker.agentId);

          if (worker.status === 'ERROR') {
            // Clean up error status workers
            await 
            this.cleanupWorker(worker.workerId);
            continue;
          }

          if (worker.lastHeartbeat < cutoffTime) {
            logger.warn(`Worker ${worker.workerId} (Agent: ${worker.agent.name}) missed heartbeat`);
            
            if (activeWorkerProcess && !activeWorkerProcess.killed) {
              logger.info(`Force stopping unresponsive worker ${worker.workerId}`);
              activeWorkerProcess.kill('SIGTERM');
              setTimeout(() => {
                if (activeWorkerProcess && !activeWorkerProcess.killed) {
                  activeWorkerProcess.kill('SIGKILL');
                }
              }, 5000);
            }

            await this.cleanupWorker(worker.workerId);

            // Note: Automatic restart is not implemented here as it requires userId
            // The frontend will need to handle restarting failed agents
            if (worker.agent.status === 'running') {
              logger.warn(`Worker for agent ${worker.agent.name} stopped unexpectedly. Manual restart required.`);
              
              // Update agent status to error to indicate intervention needed
              await prisma.agent.update({
                where: { agentId: worker.agentId },
                data: {
                  status: 'error',
                  endTime: new Date()
                }
              });
            }
          }
        }

        // 🚀 OPTIMIZATION: Clean up activeWorkers Map periodically
        const staleActiveWorkers = Array.from(activeWorkers.entries()).filter(
          ([agentId, workerProcess]) => 
            !workerProcess || workerProcess.killed
        );

        staleActiveWorkers.forEach(([agentId]) => {
          activeWorkers.delete(agentId);
          logger.debug(`Removed stale worker for agent ${agentId} from active workers map`);
        });

      } catch (error) {
        logger.error('Error during worker monitoring:', error);
      }
    }, 90000); // Increased to 90 seconds

    logger.info('Worker monitoring started (90-second intervals with 30-second heartbeat batching)');
  },

  /**
   * Stop monitoring worker health
   */
  async stopWorkerMonitoring(): Promise<void> {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      logger.info('Worker monitoring stopped');
    }
    
    // 🚀 STOP HEARTBEAT BATCHING SERVICE
    this.stopHeartbeatBatching();
  },

  /**
   * 🚀 CLEANUP WORKER METHOD
   * Clean up a specific worker by workerId (used by monitoring system)
   */
  async cleanupWorker(workerId: string): Promise<void> {
    try {
      logger.debug(`Cleaning up worker ${workerId}`);
      
      // Get the worker record to find the associated agent
      const worker = await prisma.agentWorker.findUnique({
        where: { workerId },
        include: { agent: true }
      });
      
      if (!worker) {
        logger.warn(`Worker ${workerId} not found for cleanup`);
        return;
      }
      
      const agentId = worker.agentId;
      
      // Get the active worker process from memory map
      const workerProcess = activeWorkers.get(agentId);
      
      // Kill the process if it exists
      if (workerProcess && !workerProcess.killed) {
        logger.debug(`Killing process for worker ${workerId} (agent ${agentId})`);
        workerProcess.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (activeWorkers.has(agentId) && !workerProcess.killed) {
            workerProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      
      // Clean up memory reference
      activeWorkers.delete(agentId);
      
      // Update worker status to stopped
      await prisma.agentWorker.update({
        where: { workerId },
        data: {
          status: WorkerStatus.STOPPED,
          stoppedAt: new Date(),
          error: 'Cleaned up by monitoring system'
        }
      });
      
      // Update agent status if needed
      if (worker.agent && worker.agent.status === 'running') {
        await prisma.agent.update({
          where: { agentId },
          data: {
            status: 'stopped',
            endTime: new Date()
          }
        });
      }
      
      logger.debug(`Worker ${workerId} cleanup completed`);
      
    } catch (error) {
      logger.error(`Error cleaning up worker ${workerId}:`, error);
    }
  },
}; 