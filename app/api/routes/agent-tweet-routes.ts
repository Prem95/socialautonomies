/**
 * Agent Tweet Routes
 * 
 * API endpoints for LLM-generated agent tweets
 */

import express from 'express';
import { Request, Response } from 'express';
import { agentTweetService } from '../agent-tweet-service';

const router = express.Router();

/**
 * @route POST /api/agent-tweets/generate/:agentId
 * @desc Generate a tweet for an agent using LLM
 * @access Private
 */
router.post('/generate/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Generating tweet for agent:", req.params.agentId);
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    
    const agentId = req.params.agentId;
    const userId = req.headers['x-user-id'] as string; // Extract user ID from headers
    const { context, llmProvider, url, xAccountToTag } = req.body;
    
    console.log("Extracted parameters:", {
      agentId,
      userId,
      context: context || "not provided",
      llmProvider: llmProvider || "not provided",
      url: url || "not provided",
      xAccountToTag: xAccountToTag || "not provided"
    });
    
    // Generate tweet
    const result = await agentTweetService.generateTweet({
      agentId,
      userId,
      context,
      llmProvider,
      url,
      xAccountToTag
    });
    
    if (!result.success) {
      res.status(400).json({ 
        error: result.error || 'Failed to generate tweet' 
      });
      return;
    }
    
    res.status(200).json({
      message: 'Tweet generated successfully',
      tweet: result.tweet
    });
  } catch (error) {
    console.error('Error generating tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route POST /api/agent-tweets/post/:agentId
 * @desc Generate and post a tweet for an agent
 * @access Private
 */
router.post('/post/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;
    const userId = req.headers['x-user-id'] as string; // Extract user ID from headers
    const { context, llmProvider, url, xAccountToTag } = req.body;
    
    // Generate and post tweet
    const result = await agentTweetService.generateAndPostTweet({
      agentId,
      userId,
      context,
      llmProvider,
      url,
      xAccountToTag
    });
    
    if (!result.success) {
      res.status(400).json({ 
        error: result.error || 'Failed to generate and post tweet' 
      });
      return;
    }
    
    res.status(201).json({
      message: 'Tweet generated and posted successfully',
      tweet: result.tweet
    });
  } catch (error) {
    console.error('Error generating and posting tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route POST /api/agent-tweets/post-text/:agentId
 * @desc Post a specific text as a tweet from an agent
 * @access Private
 */
router.post('/post-text/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;
    const userId = req.headers['x-user-id'] as string; // Extract user ID from headers
    const { text, replyToTweetId } = req.body;
    
    // Validate required fields
    if (!text) {
      res.status(400).json({ error: 'Tweet text is required' });
      return;
    }
    
    // Post the tweet with the provided text
    const result = await agentTweetService.postTweet({
      agentId,
      userId,
      text,
      replyToTweetId
    });
    
    if (!result.success) {
      res.status(400).json({ 
        error: result.error || 'Failed to post tweet' 
      });
      return;
    }
    
    res.status(201).json({
      message: 'Tweet posted successfully',
      tweet: result.tweet
    });
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route POST /api/agent-tweets/schedule/:agentId
 * @desc Schedule a tweet for an agent
 * @access Private
 */
router.post('/schedule/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;
    const userId = req.headers['x-user-id'] as string; // Extract user ID from headers
    const { scheduleTime, text } = req.body;
    
    // Validate required fields
    if (!scheduleTime) {
      res.status(400).json({ error: 'Schedule time is required' });
      return;
    }
    
    if (!text) {
      res.status(400).json({ error: 'Tweet text is required' });
      return;
    }
    
    // Schedule the tweet
    const result = await agentTweetService.scheduleTweet({
      agentId,
      userId,
      text,
      scheduleTime: new Date(scheduleTime)
    });
    
    if (!result.success) {
      res.status(400).json({ 
        error: result.error || 'Failed to schedule tweet' 
      });
      return;
    }
    
    res.status(201).json({
      message: 'Tweet scheduled successfully',
      tweet: result.tweet
    });
  } catch (error) {
    console.error('Error scheduling tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route POST /api/agent-tweets/generate-and-schedule/:agentId
 * @desc Generate and schedule a tweet for an agent
 * @access Private
 */
router.post('/generate-and-schedule/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;
    const userId = req.headers['x-user-id'] as string; // Extract user ID from headers
    const { context, llmProvider, scheduleTime, url, xAccountToTag } = req.body;
    
    // Validate required fields
    if (!scheduleTime) {
      res.status(400).json({ error: 'Schedule time is required' });
      return;
    }
    
    // Generate tweet first
    const generationResult = await agentTweetService.generateTweet({
      agentId,
      userId,
      context,
      llmProvider,
      url,
      xAccountToTag
    });
    
    if (!generationResult.success || !generationResult.tweet) {
      res.status(400).json({ 
        error: generationResult.error || 'Failed to generate tweet' 
      });
      return;
    }
    
    // Then schedule it
    const schedulingResult = await agentTweetService.scheduleTweet({
      agentId,
      userId,
      text: generationResult.tweet.text,
      scheduleTime: new Date(scheduleTime)
    });
    
    if (!schedulingResult.success) {
      res.status(400).json({ 
        error: schedulingResult.error || 'Failed to schedule tweet' 
      });
      return;
    }
    
    res.status(201).json({
      message: 'Tweet generated and scheduled successfully',
      tweet: schedulingResult.tweet
    });
  } catch (error) {
    console.error('Error generating and scheduling tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router; 