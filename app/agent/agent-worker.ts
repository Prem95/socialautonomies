/**
 * Agent Worker Process
 * 
 * This worker runs as a separate process for each deployed agent.
 * It handles agent initialization, tweet scheduling, and graceful shutdown.
 */

import { PrismaClient, Agent, Cookie as PrismaCookie, WorkerStatus } from '@prisma/client';
import { TwitterApi } from '../api/twitter-api';
import { Cookie } from 'tough-cookie';
import { createChatCompletion, ChatMessage, ChatCompletion } from '../api/chat';
import * as dotenv from 'dotenv';
import EventEmitter from 'events';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Environment variables passed to the worker
const AGENT_ID = process.env.AGENT_ID;
const WORKER_ID = process.env.WORKER_ID || undefined;

// Initialize Prisma client
const prisma = new PrismaClient();

// Events emitter for inter-module communication
const eventEmitter = new EventEmitter();

// Track the current state of the worker
let isRunning = false;
let shutdownRequested = false;
let lastHeartbeat: Date | null = null;
let lastError: string | null = null;

// Track active Python processes for cleanup
const activePythonProcesses = new Set<any>();

/**
 * Main worker function
 */
async function main() {
  try {
    // Validate required environment variables
    if (!AGENT_ID || !WORKER_ID) {
      throw new Error('Missing required environment variables: AGENT_ID and WORKER_ID must be provided');
    }

    console.log(`Agent Worker (Worker ID: ${WORKER_ID}, Agent ID: ${AGENT_ID}) starting up...`);

    // Update worker status to initializing
    await updateWorkerStatus(WorkerStatus.INITIALIZING);

    // Load agent configuration from database
    const agent = await loadAgentConfiguration(AGENT_ID);
    console.log(`Loaded configuration for agent: ${agent.name}`);

    // Initialize X API with cookie authentication
    const twitterApi = await initializeTwitterApi(agent.userId);
    
    // Initialize the scheduler for posting tweets
    const scheduler = initializeScheduler(agent, twitterApi);
    
    // Set up graceful shutdown
    setupGracefulShutdown();
    
    // Set running status
    isRunning = true;
    await updateWorkerStatus(WorkerStatus.RUNNING);
    
    // Start the heartbeat
    startHeartbeat();
    
    console.log(`Agent Worker (Agent ID: ${AGENT_ID}) is now running`);
    
    // Stay alive until shutdown is requested
    while (isRunning && !shutdownRequested) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Keep process alive
      if (isRunning && !shutdownRequested) {
        // Perform light health check every 30 seconds
        if (lastHeartbeat && (new Date().getTime() - lastHeartbeat.getTime() > 30000)) {
          await sendHeartbeat();
        }
      }
    }
    
    // Cleanup on shutdown
    await cleanup();
    console.log(`Agent Worker (Agent ID: ${AGENT_ID}) shut down successfully`);
    
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    console.error(`Agent Worker (Agent ID: ${AGENT_ID}) error:`, error);
    
    // Update worker status to error
    await updateWorkerStatus(WorkerStatus.ERROR, lastError);
    
    // Exit with error
    process.exit(1);
  }
}

/**
 * Load agent configuration from database
 */
async function loadAgentConfiguration(agentId: string) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: {
        profile: true,
      }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    return agent;
  } catch (error) {
    console.error('Error loading agent configuration:', error);
    throw error;
  }
}

/**
 * Helper function to run the Python cookie extraction script
 */
async function runCookieExtractionScript(userId: string, handle: string): Promise<Cookie[] | null> {
  console.log(`[${userId}-${handle}] No valid cookies found or login failed. Attempting Python script extraction...`);

  // --- Configuration ---
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3'; // Or 'python'
  // Adjust the path to where your extract.py script is located relative to the running worker process
  const scriptPath = path.resolve(__dirname, '../../extract.py'); // Example: assumes extract.py is two levels up from the built worker file
  const baseDir = path.resolve(process.env.WORKER_DATA_DIR || './worker_data'); // Configurable base directory for temp data
  const jobTimestamp = Date.now();
  // Create a unique directory for this specific script execution
  const scriptRunDir = path.join(baseDir, userId, `${handle}_${jobTimestamp}_py`);
  const cookiesDir = path.join(scriptRunDir, 'scweet_cookies'); // For Scweet's raw cookies
  const outputFile = path.join(scriptRunDir, 'converted_cookies.json'); // Python script output

  try {
    await fs.mkdir(scriptRunDir, { recursive: true }); // Ensure directory exists
    console.log(`[${userId}-${handle}] Python script temp dir: ${scriptRunDir}`);
  } catch (mkdirError) {
     console.error(`[${userId}-${handle}] Failed to create temp directory for Python script: ${mkdirError}`);
     return null; // Cannot proceed without directory
  }

  // --- Prepare Arguments ---
   const scriptArgs = [
    scriptPath,
    '--handle', handle,
    '--cookies-dir', cookiesDir, // Pass the unique dir for Scweet's cookies
    '--output-file', outputFile, // Pass the unique output file path
    '--headless',              // Always run headless in worker
    '--login',                 // Always attempt login via script
  ];

  // --- Spawn Process ---
  return new Promise((resolve) => { // Resolve with cookies array or null
    console.log(`[${userId}-${handle}] Spawning Python script: ${pythonExecutable} ${scriptArgs.join(' ')}`);
    const pythonProcess = spawn(pythonExecutable, scriptArgs);
    
    // Track this process for cleanup
    activePythonProcesses.add(pythonProcess);

    let stdoutData = '';
    let stderrData = '';
    let isResolved = false;
    let cleanupTimeout: NodeJS.Timeout | null = null;

    // Set up timeout to prevent hanging processes
    const SCRIPT_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
    const timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        console.error(`[${userId}-${handle}] Python script timeout after ${SCRIPT_TIMEOUT}ms`);
        isResolved = true;
        pythonProcess.kill('SIGKILL');
        resolve(null);
      }
    }, SCRIPT_TIMEOUT);

    // Cleanup function to remove all event handlers and timeouts
    const cleanup = async (skipDirectoryCleanup = false) => {
      if (cleanupTimeout) return; // Already cleaning up
      
      cleanupTimeout = setTimeout(async () => {
        try {
          // Clear timeout
          clearTimeout(timeoutHandle);
          
          // Remove all event listeners to prevent memory leaks
          pythonProcess.removeAllListeners();
          
          // Force kill if still running
          if (!pythonProcess.killed) {
            pythonProcess.kill('SIGKILL');
          }
          
          // Clean up temporary directory
          if (!skipDirectoryCleanup) {
            try {
              await fs.rm(scriptRunDir, { recursive: true, force: true });
              console.log(`[${userId}-${handle}] Cleaned up Python script temp directory: ${scriptRunDir}`);
            } catch (cleanupError) {
              console.error(`[${userId}-${handle}] Warning: Failed to clean up Python script temp directory ${scriptRunDir}:`, cleanupError);
            }
          }
        } catch (cleanupErr) {
          console.error(`[${userId}-${handle}] Error during cleanup:`, cleanupErr);
        }
      }, 100);
    };

    const resolveOnce = (result: Cookie[] | null) => {
      if (!isResolved) {
        isResolved = true;
        // Remove from tracking set
        activePythonProcesses.delete(pythonProcess);
        resolve(result);
        cleanup();
      }
    };

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      // Log Python output - might be verbose, consider sampling or reducing logging level
      console.log(`[${userId}-${handle}] Python stdout: ${output.trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      stderrData += errorOutput;
      console.error(`[${userId}-${handle}] Python stderr: ${errorOutput.trim()}`);
    });

    pythonProcess.on('close', async (code) => {
      if (isResolved) return; // Already handled
      
      console.log(`[${userId}-${handle}] Python script exited with code ${code}`);

      if (code === 0) {
        try {
          // Read the generated JSON file
          const cookiesJson = await fs.readFile(outputFile, 'utf-8');
          const cookies: Cookie[] = JSON.parse(cookiesJson); // Assuming Cookie matches the Python output format

          console.log(`[${userId}-${handle}] Python script success. Parsed ${cookies.length} cookies from ${outputFile}`);

          // Optional: Save these newly extracted cookies to DB for next time?
          // Consider adding a call here to save/update them in Prisma

          resolveOnce(cookies); // Resolve the promise with the cookies
        } catch (error) {
          console.error(`[${userId}-${handle}] Error reading/parsing script output file ${outputFile}:`, error);
          console.error(`[${userId}-${handle}] Python stdout was:\n${stdoutData}`);
          console.error(`[${userId}-${handle}] Python stderr was:\n${stderrData}`);
          resolveOnce(null); // Resolve with null on failure
        }
      } else {
        console.error(`[${userId}-${handle}] Python script failed (exit code ${code}).`);
        console.error(`[${userId}-${handle}] Python stdout:\n${stdoutData}`);
        console.error(`[${userId}-${handle}] Python stderr:\n${stderrData}`);
        resolveOnce(null); // Resolve with null on failure
      }
    });

    pythonProcess.on('error', (err) => {
      if (isResolved) return; // Already handled
      
      console.error(`[${userId}-${handle}] Failed to start Python process:`, err);
      resolveOnce(null); // Resolve with null on failure to spawn
      // cleanup() will be called by resolveOnce, but skip directory cleanup since process didn't start
    });

    // Handle unexpected exit
    pythonProcess.on('exit', (code, signal) => {
      if (isResolved) return; // Already handled
      
      console.log(`[${userId}-${handle}] Python process exited unexpectedly with code ${code}, signal ${signal}`);
      resolveOnce(null);
    });
  });
}

/**
 * Initialize X API with cookie authentication
 */
async function initializeTwitterApi(userId: string): Promise<TwitterApi> {
  console.log(`Initializing Twitter API for user ID: ${userId}`);
  
  // Create a new Twitter API instance
  const api = new TwitterApi({
    debug: process.env.NODE_ENV !== 'production',
  });
  
  try {
    // Try to authenticate with stored cookies
    let isAuthenticated = false;
    let loadedCookies: PrismaCookie[] = [];

    // 1. Try loading existing cookies from Database
    try {
        loadedCookies = await prisma.cookie.findMany({
          where: {
            userId,
            key: { not: undefined }, // Ensure key exists
            value: { not: undefined }, // Ensure value exists
          },
        });
        
        console.log(`Loaded ${loadedCookies.length} cookies from database for user ID: ${userId}`);
        
        if (loadedCookies.length > 0) {
          // Convert PrismaCookie to the format expected by TwitterApi
          const scraper = api.getScraper(); // Get the scraper instance
          
          // Convert cookies to the format expected by scraper.setCookies
          const cookieStrings = loadedCookies.map(cookie => {
            // Handle potentially null expires values safely
            let expiresStr = '';
            if (cookie.expires) {
              try {
                const expiresDate = new Date(cookie.expires);
                if (!isNaN(expiresDate.getTime())) {
                  expiresStr = `Expires=${expiresDate.toUTCString()}; `;
                }
              } catch (e) {
                console.warn(`Invalid expires date for cookie ${cookie.key}:`, cookie.expires);
              }
            }
            
            return `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
              cookie.path || '/'
            }; ${expiresStr}${
              cookie.secure ? 'Secure; ' : ''
            }${cookie.httpOnly ? 'HttpOnly; ' : ''}SameSite=${cookie.sameSite || 'Lax'}`;
          });
          
          // Set the cookies in the scraper
          await scraper.setCookies(cookieStrings);
          
          // Check if the cookies are valid
          isAuthenticated = await scraper.isLoggedIn();
          console.log(`Cookie authentication ${isAuthenticated ? 'successful' : 'failed'} for user ID: ${userId}`);
        }
    } catch (dbError) {
        console.error(`Error loading cookies from database for user ID: ${userId}:`, dbError);
    }

    // 2. If DB cookies failed, try running the Python script
    if (!isAuthenticated) {
      const pythonCookies = await runCookieExtractionScript(userId, AGENT_ID!);
      const scraper = api.getScraper();

      if (pythonCookies && pythonCookies.length > 0) {
          console.log(`[${AGENT_ID}] Python script succeeded. Attempting login with newly extracted cookies...`);
          try {
              // Assuming pythonCookies are already in the format scraper.setCookies expects
              await scraper.setCookies(pythonCookies);
              isAuthenticated = await scraper.isLoggedIn();

              if (isAuthenticated) {
                  console.log(`[${AGENT_ID}] Successfully authenticated with X using cookies from Python script.`);
                  // Save these fresh cookies back to the database for next time
                  try {
                      // You need a function similar to saveCookiesToDatabase but taking the Python cookie format
                      // await savePythonCookiesToDatabase(userId, pythonCookies); // Implement this function
                      console.log(`[${AGENT_ID}] Saved/Updated cookies from Python script to DB.`);
                  } catch (saveError) {
                      console.error(`[${AGENT_ID}] Failed to save cookies from Python script to DB:`, saveError);
                  }
              } else {
                  console.log(`[${AGENT_ID}] Login failed even with cookies from Python script.`);
                  await scraper.clearCookies(); // Clear cookies if login failed
              }
          } catch (pyCookieError) {
              console.error(`[${AGENT_ID}] Error setting/checking cookies from Python script:`, pyCookieError);
              isAuthenticated = false; // Ensure we proceed
              try { await scraper.clearCookies(); } catch {}
          }
      } else {
          console.log(`[${AGENT_ID}] Python script failed or returned no cookies.`);
      }
    }

    // 3. If all cookie methods failed, try password login as a fallback
    if (!isAuthenticated && process.env.TWITTER_PASSWORD) {
      console.log(`[${AGENT_ID}] Attempting to login with X credentials as fallback...`);
      try {
          // Assuming api.login() uses the password provided during initialization
          isAuthenticated = await api.login();

          if (isAuthenticated) {
            console.log(`[${AGENT_ID}] Successfully authenticated with X using credentials.`);
            // Save the new cookies obtained from password login
            try {
              // Reuse your existing saveCookiesToDatabase function
              await saveCookiesToDatabase(userId, api);
              console.log('[${AGENT_ID}] X cookies from credential login saved to database.');
            } catch (cookieError) {
              console.error('[${AGENT_ID}] Failed to save cookies from credential login:', cookieError);
            }
          } else {
            // Password login failed
             console.error(`[${AGENT_ID}] Failed to authenticate with X using credentials.`);
          }
      } catch (loginError) {
          console.error(`[${AGENT_ID}] Error during credential login attempt:`, loginError);
          isAuthenticated = false;
      }
    }

    // Final Check: If still not authenticated after all methods, throw error
    if (!isAuthenticated) {
      throw new Error(`[${AGENT_ID}] All X authentication methods failed (DB Cookies, Python Script, Credentials). Agent cannot start.`);
    }

    console.log(`[${AGENT_ID}] X API initialization successful.`);
    return api; // Return the initialized and authenticated API instance

  } catch (error) {
    // Log the specific agent ID/name in the error message
    const agentName = AGENT_ID ? `Agent ID ${AGENT_ID}` : 'Unknown Agent';
    console.error(`Error initializing X API for ${agentName}:`, error);
    // Propagate the error to be caught by the main worker function
    throw new Error(`X API initialization failed for ${agentName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save X cookies to the database
 */
async function saveCookiesToDatabase(userId: string, api: TwitterApi) {
  // Get the scraper to access cookies
  const scraper = api.getScraper();
  const cookies = await scraper.getCookies();
  
  if (!cookies || cookies.length === 0) {
    throw new Error('No cookies available to save');
  }
  
  console.log(`Processing ${cookies.length} cookies from X API`);
  console.log(`Cookie type: ${typeof cookies}, prototype: ${Object.prototype.toString.call(cookies)}`);
  
  // Debug cookie structure
  if (cookies.length > 0) {
    console.log(`Cookie sample keys: ${JSON.stringify(Object.keys(cookies[0]), null, 2)}`);
    console.log(`Cookie sample: ${JSON.stringify(cookies[0], null, 2)}`);
  }
  
  // Check if we're dealing with Cookie objects from agent-twitter-client
  let cookieObjects = cookies;
  if (cookies.length > 0 && typeof cookies[0] === 'object' && 'key' in cookies[0]) {
    console.log(`Detected agent-twitter-client Cookie objects`);
    
    // Log a sample for debugging
    console.log(`First cookie sample:`, cookies[0]);
  }
  
  // Save each cookie to the database
  const savedCookies = [];
  
  for (const cookie of cookieObjects) {
    // Check if the expires timestamp is valid before creating a Date
    let expiresDate = null;
    if (cookie.expires) {
      // Handle special cases like Infinity
      const timestamp = new Date(cookie.expires).getTime();
      if (!isNaN(timestamp) && timestamp > 0) {
        expiresDate = new Date(timestamp);
      }
    }
    
    const cookieData = {
      userId,
      key: cookie.key,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: expiresDate,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite || 'Lax'
    };
    
    // Use upsert to update if exists or create if not
    const savedCookie = await prisma.cookie.upsert({
      where: {
        userId_key: {
          userId,
          key: cookie.key
        }
      },
      update: cookieData,
      create: cookieData
    });
    
    savedCookies.push(savedCookie);
  }
  
  console.log(`Saved ${savedCookies.length} cookies to database for user ${userId}`);
  return savedCookies;
}

/**
 * Initialize the scheduler based on agent configuration
 */
function initializeScheduler(agent: Agent, twitterApi: TwitterApi) {
  // Default schedule if none is provided
  const defaultSchedule = {
    tweetFrequency: 'daily', // daily, hourly, custom
    tweetsPerDay: 3,
    timeSlots: ['09:00', '13:00', '17:00'], // Default to 9am, 1pm, 5pm
    timezone: 'UTC'
  };
  
  // Use agent's schedule or default
  const schedule = agent.schedule || defaultSchedule;
    
  // Set up scheduled tasks
  setupScheduledTasks(agent, schedule, twitterApi);
  
  return schedule;
}

/**
 * Set up scheduled tasks based on agent configuration
 */
function setupScheduledTasks(agent: Agent, schedule: any, twitterApi: TwitterApi) {
  // Create the chat completion instance for generating tweets
  const chatCompletion = createChatCompletion();
  
  // Set up the next tweet time based on schedule
  scheduleNextTweet(agent, schedule, twitterApi, chatCompletion);
}

/**
 * Schedule the next tweet based on agent's configuration
 */
function scheduleNextTweet(agent: Agent, schedule: any, twitterApi: TwitterApi, chatCompletion: ChatCompletion) {
  try {
    // Get the next time to post based on schedule
    const nextPostTime = calculateNextPostTime(schedule);
    const now = new Date();
    
    // Calculate delay in milliseconds
    const delay = nextPostTime.getTime() - now.getTime();
    
    console.log(`Next tweet for agent ${agent.name} scheduled at ${nextPostTime.toISOString()}`);
    
    // Schedule the tweet
    setTimeout(async () => {
      if (isRunning && !shutdownRequested) {
        try {
          await postTweet(agent, twitterApi, chatCompletion);
          // Schedule the next tweet after posting
          scheduleNextTweet(agent, schedule, twitterApi, chatCompletion);
        } catch (error) {
          console.error('Error posting scheduled tweet:', error);
          // Retry after a delay
          setTimeout(() => {
            if (isRunning && !shutdownRequested) {
              scheduleNextTweet(agent, schedule, twitterApi, chatCompletion);
            }
          }, 60000); // Retry after 1 minute
        }
      }
    }, delay > 0 ? delay : 1000);
  } catch (error) {
    console.error('Error scheduling next tweet:', error);
  }
}

/**
 * Calculate the next time to post based on schedule
 */
function calculateNextPostTime(schedule: any) {
  const now = new Date();
  
  // Default to 1 hour from now if schedule is invalid
  let nextTime = new Date(now.getTime() + 60 * 60 * 1000);
  
  try {
    if (schedule.tweetFrequency === 'hourly') {
      // Post at the start of the next hour
      nextTime = new Date(now);
      nextTime.setHours(nextTime.getHours() + 1);
      nextTime.setMinutes(0);
      nextTime.setSeconds(0);
      nextTime.setMilliseconds(0);
    } else if (schedule.tweetFrequency === 'daily') {
      // Find the next time slot today
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      let foundTimeSlot = false;
      
      for (const timeSlot of schedule.timeSlots) {
        const [hour, minute] = timeSlot.split(':').map(Number);
        
        // Create a date object for this time slot today
        const timeSlotDate = new Date(now);
        timeSlotDate.setHours(hour, minute, 0, 0);
        
        // If this time slot is in the future today, use it
        if (timeSlotDate > now) {
          nextTime = timeSlotDate;
          foundTimeSlot = true;
          break;
        }
      }
      
      // If no time slot found today, use the first one tomorrow
      if (!foundTimeSlot && schedule.timeSlots.length > 0) {
        const [hour, minute] = schedule.timeSlots[0].split(':').map(Number);
        nextTime = new Date(now);
        nextTime.setDate(nextTime.getDate() + 1);
        nextTime.setHours(hour, minute, 0, 0);
      }
    } else if (schedule.tweetFrequency === 'custom' && schedule.customInterval) {
      // Custom interval in minutes
      nextTime = new Date(now.getTime() + schedule.customInterval * 60 * 1000);
    }
  } catch (error) {
    console.error('Error calculating next post time:', error);
  }
  
  return nextTime;
}

/**
 * Post a tweet based on agent configuration
 */
async function postTweet(agent: Agent, twitterApi: TwitterApi, chatCompletion: ChatCompletion) {
  try {
    console.log(`Generating tweet for agent ${agent.name}...`);
    
    // Prepare the system prompt based on agent's brand/voice
    const systemPrompt = prepareSystemPrompt(agent);
    
    // Generate a topic if one isn't provided
    const topic = generateTweetTopic(agent);
    
    // Create the prompt for the AI
    const prompt: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate a tweet about ${topic}. Keep it under 280 characters.`
      }
    ];
    
    // Generate the tweet text
    const tweetText = await chatCompletion.generateConversation(prompt);
    console.log(`Generated tweet: ${tweetText}`);
    
    // Use the external tweet handler for actual posting
    return await postExternalTweet(agent, twitterApi, tweetText);
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

/**
 * Handler for externally or API triggered tweets
 * Separated to allow direct API posting without crashing the worker
 */
async function postExternalTweet(agent: Agent, twitterApi: TwitterApi, text: string) {
  try {
    console.log(`Posting tweet for agent ${agent.name}: "${text.substring(0, 30)}..."`);
    
    // Post the tweet
    const postResult = await twitterApi.postTweet(text);
    
    if (postResult.success) {
      console.log('Tweet posted successfully');
      
      // Save to database with X metadata if available
      await prisma.tweet.create({
        data: {
          agentId: agent.agentId,
          text,
          postTime: postResult.timestamp || new Date(),
          twitterTweetId: postResult.tweetId || null,
          url: postResult.url || null
        }
      });
      
      if (postResult.tweetId) {
        console.log(`X tweet ID: ${postResult.tweetId}`);
        console.log(`X URL: ${postResult.url}`);
      }
    } else {
      console.error('Failed to post tweet to X');
      return false;
    }
    
    return postResult.success;
  } catch (error) {
    console.error('Error in external tweet handling:', error);
    
    // Critical - don't let this crash the worker
    // Just log the error and return false to indicate failure
    return false;
  }
}

/**
 * Prepare system prompt based on agent configuration
 */
function prepareSystemPrompt(agent: Agent) {
  // Default prompt if no brand is configured
  let systemPrompt = 'You are a X content creator. Generate engaging, concise tweets that are informative and interesting. Keep the tone professional but friendly.';
  
  // If agent has brand configuration, use it
  if (agent.brand) {
    const brand = agent.brand;
    systemPrompt = `You are ${agent.name}, a X content creator with the following characteristics:\n`;
    
    if (typeof brand === 'object' && brand !== null && 'voice' in brand) {
      systemPrompt += `Voice: ${brand.voice}\n`;
    }
    
    if (typeof brand === 'object' && brand !== null && 'personality' in brand) {
      systemPrompt += `Personality: ${brand.personality}\n`;
    }
    
    if (typeof brand === 'object' && brand !== null && 'values' in brand && Array.isArray(brand.values)) {
      systemPrompt += `Values: ${brand.values.join(', ')}\n`;
    }
    
    systemPrompt += `\nYour goal is: ${agent.goal}\n`;
    systemPrompt += 'Generate engaging, concise tweets that reflect your voice and personality.';
  }
  
  return systemPrompt;
}

/**
 * Generate a topic for the tweet
 */
function generateTweetTopic(agent: Agent) {
  // Default topics
  const defaultTopics = [
    'the latest technology trends',
    'artificial intelligence advancements',
    'productivity tips',
    'digital transformation',
    'the future of work',
    'remote work culture',
    'emerging technologies',
    'industry news and updates'
  ];
  
  // If agent has specific topics in their brand, use those
  if (agent.brand && typeof agent.brand === 'object' && 'topics' in agent.brand && Array.isArray(agent.brand.topics) && agent.brand.topics.length > 0) {
    const randomIndex = Math.floor(Math.random() * agent.brand.topics.length);
    return agent.brand.topics[randomIndex];
  }
  
  // Otherwise use a default topic
  const randomIndex = Math.floor(Math.random() * defaultTopics.length);
  return defaultTopics[randomIndex];
}

/**
 * Update worker status in the database
 */
async function updateWorkerStatus(status: WorkerStatus, errorMessage?: string) {
  try {
    if (!WORKER_ID) return;
    
    console.log(`Updating worker status to ${status}${errorMessage ? ` (${errorMessage})` : ''}`);
    
    await prisma.agentWorker.update({
      where: { workerId: WORKER_ID },
      data: {
        status,
        ...(errorMessage && { error: errorMessage }),
        ...(status === WorkerStatus.STOPPED && { stoppedAt: new Date() })
      }
    });
    
    // If the worker is now running or stopped, update the agent status too
    if (status === WorkerStatus.RUNNING || status === WorkerStatus.STOPPED || status === WorkerStatus.ERROR) {
      const agentStatus = status === WorkerStatus.RUNNING ? 'running' : 
                          status === WorkerStatus.STOPPED ? 'stopped' : 'error';
      
      await prisma.agent.update({
        where: { agentId: AGENT_ID! },
        data: {
          status: agentStatus,
          ...(status === WorkerStatus.STOPPED && { endTime: new Date() })
        }
      });
    }
  } catch (error) {
    console.error('Error updating worker status:', error);
  }
}

/**
 * Start heartbeat to update worker status periodically
 */
function startHeartbeat() {
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  // Send a heartbeat immediately
  sendHeartbeat();
  
  // Set up interval for heartbeats
  const heartbeatInterval = setInterval(() => {
    if (isRunning && !shutdownRequested) {
      sendHeartbeat();
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Send a heartbeat to the database via batching service
 */
async function sendHeartbeat() {
  try {
    if (!WORKER_ID) return;
    
    lastHeartbeat = new Date();
    
    // 🚀 OPTIMIZED: Use heartbeat batching via direct service call
    // Import the service dynamically to avoid circular dependencies
    const { agentManagerService } = await import('../db/services/agentManagerService');
    agentManagerService.queueHeartbeat(WORKER_ID);
    
    console.log(`Heartbeat queued for worker ${WORKER_ID}`);
    
  } catch (error) {
    console.error('Error sending heartbeat:', error);
    
    // Fallback to direct database update if batching fails
    try {
      await prisma.agentWorker.update({
        where: { workerId: WORKER_ID },
        data: {
          lastHeartbeat: new Date()
        }
      });
    } catch (dbError) {
      console.error('Error in heartbeat fallback:', dbError);
    }
  }
}

/**
 * Set up handlers for graceful shutdown
 */
function setupGracefulShutdown() {
  // Listen for termination signals
  process.on('SIGTERM', () => requestShutdown('SIGTERM'));
  process.on('SIGINT', () => requestShutdown('SIGINT'));
  
  // Listen for IPC messages for shutdown
  process.on('message', (message) => {
    if (message === 'shutdown') {
      requestShutdown('IPC message');
    }
  });
}

/**
 * Request a graceful shutdown
 */
async function requestShutdown(reason: string) {
  if (shutdownRequested) {
    return; // Already requested
  }
  
  console.log(`Agent Worker (Agent ID: ${AGENT_ID}) shutdown requested (${reason})`);
  shutdownRequested = true;
  
  try {
    // Update status to stopping
    await updateWorkerStatus(WorkerStatus.STOPPING);
    
    // Give cleanup a chance to run via the main loop
    // If it doesn't complete within 5 seconds, we'll force exit
    setTimeout(() => {
      console.log(`Agent Worker (Agent ID: ${AGENT_ID}) forcing exit...`);
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error('Error during shutdown request:', error);
    process.exit(1);
  }
}

/**
 * Perform cleanup tasks before shutdown
 */
async function cleanup() {
  try {
    console.log(`Agent Worker (Agent ID: ${AGENT_ID}) cleaning up...`);
    
    // Kill any remaining Python processes
    if (activePythonProcesses.size > 0) {
      console.log(`Cleaning up ${activePythonProcesses.size} active Python processes...`);
      for (const process of activePythonProcesses) {
        try {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        } catch (killError) {
          console.error('Error killing Python process:', killError);
        }
      }
      activePythonProcesses.clear();
    }
    
    // Update worker status to stopped
    await updateWorkerStatus(WorkerStatus.STOPPED);
    
    // Close database connection
    await prisma.$disconnect();
    
    console.log(`Agent Worker (Agent ID: ${AGENT_ID}) cleanup complete`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    
    // Try to update status to error before exiting
    try {
      await updateWorkerStatus(WorkerStatus.ERROR, error instanceof Error ? error.message : String(error));
    } catch (updateError) {
      console.error('Failed to update worker status during cleanup:', updateError);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in agent worker:', error);
  process.exit(1);
}); 