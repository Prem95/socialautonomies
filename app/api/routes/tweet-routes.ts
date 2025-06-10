/**
 * Tweet Routes
 * 
 * API endpoints for tweet interactions with agents
 */

import express from 'express';
import { Request, Response } from 'express';
import prisma from '../../db/utils/dbClient';
import { agentService } from '../../db/services';
import { TwitterApi } from '../twitter-api';
import { twitterAuthService } from '../twitter-auth-service';

const router = express.Router();

/**
 * @route GET /api/tweets
 * @desc Get all tweets for the authenticated user's agents
 * @access Private
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    
    // Get all tweets for user's agents
    const tweets = await prisma.tweet.findMany({
      where: {
        agent: {
          userId
        }
      },
      include: {
        agent: {
          select: {
            name: true,
            goal: true
          }
        }
      },
      orderBy: {
        postTime: 'desc'
      }
    });
    
    res.json(tweets);
  } catch (error) {
    console.error('Error getting tweets:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route GET /api/tweets/:id
 * @desc Get a specific tweet by ID
 * @access Private
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tweetId = req.params.id;
    const userId = req.user.id;
    
    // Get tweet and check ownership
    const tweet = await prisma.tweet.findUnique({
      where: { tweetId },
      include: {
        agent: true
      }
    });
    
    if (!tweet) {
      res.status(404).json({ error: 'Tweet not found' });
      return;
    }
    
    // Check if the tweet belongs to one of the user's agents
    if (tweet.agent.userId !== userId) {
      res.status(403).json({ error: 'You do not have permission to access this tweet' });
      return;
    }
    
    res.json(tweet);
  } catch (error) {
    console.error('Error getting tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @route POST /api/tweets/agent/:agentId
 * @desc Post a tweet from a specific agent
 * @access Private
 */
router.post('/agent/:agentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.params.agentId;
    const userId = req.user.id;
    const { text } = req.body;
    
    // Validate required fields
    if (!text) {
      res.status(400).json({ error: 'Tweet text is required' });
      return;
    }
    
    // Get agent and verify ownership
    const agent = await agentService.getAgentById(agentId);
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    if (agent.userId !== userId) {
      res.status(403).json({ error: 'You do not have permission to post tweets for this agent' });
      return;
    }
    
    // Check if agent is running
    if (agent.status !== 'running') {
      res.status(400).json({ 
        error: 'Agent must be running to post tweets',
        agentStatus: agent.status
      });
      return;
    }
    
    // Verify X authentication
    const authResult = await twitterAuthService.verifyAuthentication(
      userId,
      agent.name
    );
    
    if (!authResult.authenticated || !authResult.api) {
      res.status(401).json({ 
        error: 'X authentication failed',
        details: authResult.error || 'Unknown authentication error'
      });
      return;
    }
    
    // Post the tweet
    const postResult = await authResult.api.postTweet(text);
    
    if (!postResult.success) {
      res.status(500).json({ error: 'Failed to post tweet to X' });
      return;
    }
    
    // Save tweet to database with X metadata if available
    const tweet = await prisma.tweet.create({
      data: {
        agentId,
        text,
        postTime: postResult.timestamp || new Date(),
        twitterTweetId: postResult.tweetId || null,
        url: postResult.url || null
      }
    });
    
    res.status(201).json({
      message: 'Tweet posted successfully',
      tweetId: tweet.tweetId,
      tweet,
      twitterMetadata: {
        tweetId: postResult.tweetId,
        url: postResult.url,
        timestamp: postResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router; 