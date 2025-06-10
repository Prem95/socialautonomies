/**
 * Scheduler Service
 * 
 * Handles background processing of scheduled tasks, like posting tweets, auto-tweets, and auto-engagement.
 */

import prisma, { schedulerQueries } from "../db/utils/dbClient";
import { agentTweetService } from "./agent-tweet-service";
import { autoEngageService } from "./auto-engage-service";
import { isBefore } from 'date-fns';
import { AgentStatus } from '@prisma/client';

// Store cleanup functions for intervals
let schedulerInterval: NodeJS.Timeout | null = null;

export const schedulerService = {
  /**
   * Find and process due scheduled tweets (one-off)
   */
  async processScheduledTweets(): Promise<void> {
    // console.log(`[Scheduler - OneOff] Checking for scheduled tweets at ${new Date().toISOString()}`);
    
    try {
      // 🚀 OPTIMIZED: Use pre-compiled query with better select fields
      const dueTweets = await schedulerQueries.findScheduledTweets();
      
      if (dueTweets.length === 0) {
        // console.log("[Scheduler - OneOff] No due tweets found.");
        return;
      }
      
      console.log(`[Scheduler - OneOff] Found ${dueTweets.length} due tweet(s). Processing...`);
      
      // Process each due tweet
      for (const tweet of dueTweets) {
        // Safeguard: Check if agent relation was loaded correctly
        if (!tweet.agent?.userId || !tweet.agent?.status) {
           console.error(`[Scheduler - OneOff] Skipping tweet ID: ${tweet.tweetId} due to missing agent data (userId or status).`);
           // Optionally update status to failed here
           await prisma.tweet.update({ where: { tweetId: tweet.tweetId }, data: { status: 'failed' } });
           continue;
        }

        // Check if the agent is active before posting
        if (tweet.agent.status !== AgentStatus.running) {
            console.log(`[Scheduler - OneOff] Skipping tweet ID: ${tweet.tweetId} because agent ${tweet.agentId} is not active (status: ${tweet.agent.status}).`);
            // Optionally update the tweet status to indicate it was skipped due to agent status
            // Example: await prisma.tweet.update({ where: { tweetId: tweet.tweetId }, data: { status: 'skipped' } });
            continue; // Skip to the next tweet
        }

        console.log(`[Scheduler - OneOff] Processing tweet ID: ${tweet.tweetId} for active agent ${tweet.agentId}`);
        await this.postAndLogTweet(tweet.tweetId, tweet.agentId, tweet.agent.userId, tweet.text);
      }
    } catch (error) {
      console.error("[Scheduler - OneOff] Error fetching or processing scheduled tweets:", error);
    }
  },
  
  /**
   * Find agents due for interval-based auto-tweets, generate the specified count,
   * and schedule them spread across the interval.
   */
  async processAutoTweets(): Promise<void> {
    try {
      const now = new Date();
      // 🚀 OPTIMIZED: Use pre-compiled query with selective fields
      const candidateAgents = await schedulerQueries.findAutoTweetAgents();

      if (candidateAgents.length === 0) {
        return; // No agents configured correctly
      }

      const agentsToProcess = [];
      for (const agent of candidateAgents) {
        if (!agent.autoTweetFrequencyHours || !agent.autoTweetCount) continue; // Should not happen due to query

        if (!agent.lastAutoTweetTime) { // First time, always process
          agentsToProcess.push(agent);
          continue;
        }

        // Convert frequency hours to milliseconds
        const intervalMs = agent.autoTweetFrequencyHours * 60 * 60 * 1000;

        // Check if the interval has passed since the last cycle started
        const nextCycleStartTime = new Date(agent.lastAutoTweetTime.getTime() + intervalMs);
        
        // Add 5-second tolerance buffer to account for timing precision issues
        // This prevents missing triggers when scheduler and auto-tweet frequency are similar
        const toleranceMs = 5000; // 5 seconds
        const adjustedCheckTime = new Date(nextCycleStartTime.getTime() - toleranceMs);
        
        if (isBefore(adjustedCheckTime, now) || adjustedCheckTime.getTime() === now.getTime()) {
          agentsToProcess.push(agent);
        }
      }

      if (agentsToProcess.length === 0) {
        // console.log("[Scheduler - Auto] No agents due for a new auto-tweet cycle.");
        return;
      }

      console.log(`[Scheduler - Auto] Found ${agentsToProcess.length} agent(s) due for a new auto-tweet cycle. Scheduling individual tweets...`);

      for (const agent of agentsToProcess) {
        // These are guaranteed to exist due to the loop condition and query
        const intervalMs = agent.autoTweetFrequencyHours! * 60 * 60 * 1000;
        const tweetsToGenerate = agent.autoTweetCount!;

        // Calculate time between posts within the interval (handle division by zero just in case)
        const millisecondsBetweenPosts = tweetsToGenerate > 0 ? intervalMs / tweetsToGenerate : intervalMs;

        console.log(`[Scheduler - Auto] Agent ${agent.agentId}: Scheduling ${tweetsToGenerate} tweets over ${agent.autoTweetFrequencyHours}h (approx. 1 every ${Math.round(millisecondsBetweenPosts / 60000)} min)`);

        let scheduledCount = 0;
        for (let i = 0; i < tweetsToGenerate; i++) {
           try {
            // Calculate post time: start slightly in the future, add offset for each tweet
            const postTimeOffsetMs = 5000 + (i * millisecondsBetweenPosts); // Start 5s in future + offset
            const postTime = new Date(now.getTime() + postTimeOffsetMs);

            console.log(`[Scheduler - Auto] Generating tweet ${i + 1}/${tweetsToGenerate} for agent ${agent.agentId}, scheduled for ${postTime.toISOString()}`);

            // 1. Generate the tweet content
            const generationResult = await agentTweetService.generateTweet({
              agentId: agent.agentId,
              userId: agent.userId,
            });

            if (!generationResult.success || !generationResult.tweet?.text) {
              console.error(`[Scheduler - Auto] Failed to generate tweet content #${i+1} for agent ${agent.agentId}: ${generationResult.error}`);
              continue; // Skip this specific tweet, try the next one in the loop
            }

            // 2. Create a scheduled tweet record
            await prisma.tweet.create({
                data: {
                    agentId: agent.agentId,
                    text: generationResult.tweet.text,
                    postTime: postTime,
                    status: 'scheduled'
                }
            });
            scheduledCount++;

          } catch (scheduleError) {
             console.error(`[Scheduler - Auto] Error generating/scheduling auto-tweet #${i+1} for agent ${agent.agentId}:`, scheduleError);
          }
        } // End loop for generating tweets within interval

        // Update lastAutoTweetTime *after* attempting to schedule all tweets for this cycle
        await prisma.agent.update({
          where: { agentId: agent.agentId },
          data: { lastAutoTweetTime: now } // Mark the start of this cycle
        });
        console.log(`[Scheduler - Auto] Agent ${agent.agentId}: Cycle complete. Attempted to schedule ${scheduledCount}/${tweetsToGenerate} tweets. Updated lastAutoTweetTime.`);

      } // End loop for agents to process

    } catch (error) {
      console.error("[Scheduler - Auto] Error processing auto-tweet cycles:", error);
    }
  },

  /**
   * Find agents due for auto-engagement cycles and process them
   */
  async processAutoEngagement(): Promise<void> {
    try {
      const now = new Date();
      
      // 🚀 OPTIMIZED: Use pre-compiled query with selective fields  
      const candidateAgents = await schedulerQueries.findAutoEngageAgents();

      if (candidateAgents.length === 0) {
        // console.log("[Scheduler - Auto-Engage] No agents configured for auto-engagement.");
        return;
      }

      const agentsToProcess = [];
      for (const agent of candidateAgents) {
        if (!agent.autoEngageFrequencyHours || !agent.autoEngageMaxReplies) continue;

        if (!agent.lastAutoEngageTime) { // First time, always process
          agentsToProcess.push(agent);
          continue;
        }

        // Convert frequency hours to milliseconds
        const intervalMs = agent.autoEngageFrequencyHours * 60 * 60 * 1000;

        // Check if the interval has passed since the last cycle started
        const nextCycleStartTime = new Date(agent.lastAutoEngageTime.getTime() + intervalMs);
        
        // Add 5-second tolerance buffer to account for timing precision issues
        // This prevents missing triggers when scheduler and auto-engage frequency are similar
        const toleranceMs = 5000; // 5 seconds
        const adjustedCheckTime = new Date(nextCycleStartTime.getTime() - toleranceMs);
        
        if (isBefore(adjustedCheckTime, now) || adjustedCheckTime.getTime() === now.getTime()) {
          agentsToProcess.push(agent);
        }
      }

      if (agentsToProcess.length === 0) {
        // console.log("[Scheduler - Auto-Engage] No agents due for a new auto-engagement cycle.");
        return;
      }

      console.log(`[Scheduler - Auto-Engage] Found ${agentsToProcess.length} agent(s) due for auto-engagement cycle.`);

      for (const agent of agentsToProcess) {
        try {
          console.log(`[Scheduler - Auto-Engage] Processing agent ${agent.agentId} for auto-engagement`);
          
          // Run auto-engage cycle
          const result = await autoEngageService.runAutoEngageCycle(agent.agentId, agent.userId);
          
          // Log results regardless of success/failure (results are now included in both cases)
          if (result.results) {
            const status = result.success ? 'completed successfully' : 'completed with errors';
            console.log(`[Scheduler - Auto-Engage] Agent ${agent.agentId} cycle ${status}:`, {
              tweetsAnalyzed: result.results.tweetsFetched,
              repliesGenerated: result.results.repliesGenerated,
              repliesPosted: result.results.repliesPosted,
              repliesFailed: result.results.repliesFailed
            });
          }
          
          // Handle specific errors (Cloudflare blocks, auth issues, etc.)
          if (!result.success) {
            const errorMessage = result.error || 'Unknown error';
            console.error(`[Scheduler - Auto-Engage] Agent ${agent.agentId} error: ${errorMessage}`);
            
            // Handle Cloudflare blocks with additional cooldown (beyond the standard lastAutoEngageTime update)
            if (errorMessage.includes('Cloudflare') || errorMessage.includes('temporarily blocked')) {
              console.log(`[Scheduler - Auto-Engage] Implementing extended cooldown for agent ${agent.agentId} due to rate limiting`);
              
              // Add additional 30-minute cooldown for Cloudflare blocks
              try {
                await prisma.agent.update({
                  where: { agentId: agent.agentId },
                  data: {
                    lastAutoEngageTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
                  }
                });
                console.log(`[Scheduler - Auto-Engage] Applied extended 30-minute cooldown for agent ${agent.agentId}`);
              } catch (cooldownError) {
                console.error(`[Scheduler - Auto-Engage] Failed to apply extended cooldown for agent ${agent.agentId}:`, cooldownError);
              }
            }
          }
          
        } catch (error) {
          console.error(`[Scheduler - Auto-Engage] Error processing agent ${agent.agentId}:`, error);
        }
      }

    } catch (error) {
      console.error("[Scheduler - Auto-Engage] Error processing auto-engagement cycles:", error);
    }
  },

  /**
   * Helper function to post a tweet and update its status in the database
   * @returns boolean indicating if the post was successful
   */
  async postAndLogTweet(tweetId: string, agentId: string, userId: string, text: string): Promise<boolean> {
    // Mark the scheduled tweet as 'posting'
    // Use the passed tweetId which is guaranteed to exist for scheduled tweets
    try {
      await prisma.tweet.update({
        where: { tweetId: tweetId },
        data: { status: 'posting' }
      });
    } catch (updateError) {
      console.error(`[Scheduler] Failed to update status to 'posting' for tweet ${tweetId}:`, updateError);
      // Decide whether to proceed or return false. Let's proceed for now.
    }

    try {
      // Call the service to post to the external platform (e.g., X)
      // ASSUMPTION: agentTweetService.postTweet is modified to NOT create a DB record
      //             when dealing with an existing scheduled tweet (identified perhaps by
      //             passing tweetId to it). It just posts and returns the platform's response.
      const result = await agentTweetService.postTweet({
        agentId: agentId,
        userId: userId,
        text: text,
        // You might need to signal to agentTweetService that this is from a schedule,
        // e.g., by passing the tweetId if its interface supports it.
        // scheduledTweetId: tweetId // Example if the service needs it
      });

      const finalStatus = result.success ? 'posted' : 'failed';
      // Get the actual post time only if successful
      const actualPostTime = result.success ? (result.tweet?.timestamp || new Date()) : null;

      // Update the original scheduled tweet record with the outcome
      await prisma.tweet.update({
        where: { tweetId: tweetId }, // Use the original tweetId
        data: {
          status: finalStatus,
          // Get the twitterId/url directly from the result of the postTweet call
          twitterTweetId: result.tweet?.twitterId || null,
          url: result.tweet?.url || null,
          // Update postTime only if successful to reflect actual posting time
          ...(actualPostTime && { postTime: actualPostTime })
        }
      });

      console.log(`[Scheduler] Scheduled tweet (DB ID: ${tweetId}) processed for Agent ${agentId}. Success: ${result.success}`);
      return result.success;

    } catch (postError) {
      console.error(`[Scheduler] Error processing scheduled tweet (DB ID: ${tweetId}) for Agent ${agentId}:`, postError);

      // Attempt to update status to 'failed' upon catching an error
      try {
        await prisma.tweet.update({
          where: { tweetId: tweetId },
          data: { status: 'failed' }
        });
      } catch (failUpdateError) {
        console.error(`[Scheduler] Failed to update status to 'failed' for tweet ${tweetId} after post error:`, failUpdateError);
      }
      return false; // Indicate failure
    }
  },
  
  /**
   * Initialize the scheduler
   * 
   * @param intervalMinutes - How often to check for due tasks (in minutes)
   */
  initialize(intervalMinutes: number = 1): void {
    const checkIntervalMs = intervalMinutes * 60 * 1000;
    console.log(`[Scheduler] Initializing scheduler to run checks every ${intervalMinutes} minute(s).`);
    
    // Clear any existing interval
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    
    // Run checks immediately on start
    this.runChecks();
    
    // Schedule periodic checks with proper cleanup tracking
    schedulerInterval = setInterval(() => {
      this.runChecks();
    }, checkIntervalMs);
    
    // Set up graceful shutdown handlers
    const cleanup = () => {
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Scheduler interval cleaned up');
      }
    };
    
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('exit', cleanup);
  },
  
  /**
   * Cleanup method to stop the scheduler
   */
  cleanup(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[Scheduler] Scheduler stopped and cleaned up');
    }
  },
  
  /**
   * Run all scheduler checks
   */
  runChecks(): void {
    this.processScheduledTweets(); // Handles one-off and individually scheduled auto-tweets
    this.processAutoTweets(); // Handles kicking off new auto-tweet cycles
    this.processAutoEngagement(); // Handles auto-engagement cycles
  }
}; 