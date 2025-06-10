// /**
//  * Agent Routes - API endpoints for agent deployment and management
//  */

// import express from 'express';
// import { agentManagerService, agentService } from '../../db/services';
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { TwitterApi } from 'twitter-api-v2';
// import { TwitterApi as CustomTwitterApiWrapper } from '../twitter-api';

// const router = express.Router();
// const prisma = new PrismaClient();

// const DEFAULT_USER_ID = '58585c1e-2093-4193-9022-1f2d18c59ea1';

// function getUserId(req: Request): string {
//   return req.userId || (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;
// }

// /**
//  * @route GET /api/agents
//  */
// router.get('/', async (req: Request, res: Response) => {
//   try {
//     const userId = getUserId(req);
//     const agents = await agentService.getAgentsByUserId(userId);
//     res.json(agents);
//   } catch (error) {
//     console.error('Error getting agents:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route GET /api/agents/status
//  */
// router.get('/status', async (req: Request, res: Response) => {
//   try {
//     const userId = getUserId(req);
//     const status = await agentManagerService.getAgentStatus(userId);
//     res.json(status);
//   } catch (error) {
//     console.error('Error getting agent status:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route GET /api/agents/:id
//  */
// router.get('/:id', async (req: Request, res: Response) => {
//   try {
//     const agentId = req.params.id;
//     const agent = await agentService.getAgentWithAll(agentId);
//     res.json(agent);
//   } catch (error) {
//     console.error('Error getting agent:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route POST /api/agents
//  */
// router.post('/', async (req: Request, res: Response) => {
//   try {
//     const userId = getUserId(req);
//     const { name, goal, brand, language } = req.body;
    
//     if (!name || !goal) {
//       res.status(400).json({ error: 'Name and goal are required' });
//       return;
//     }
    
//     const newAgent = await agentService.createAgent({
//       name,
//       goal,
//       brand: brand || {},
//       language: language || 'en-US',
//       profile: {
//         connect: { userId }
//       }
//     });
    
//     res.status(201).json(newAgent);
//   } catch (error) {
//     console.error('Error creating agent:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route PUT /api/agents/:id
//  */
// router.put('/:id', async (req: Request, res: Response) => {
//   try {
//     const agentId = req.params.id;
//     const agent = await agentService.getAgentById(agentId);
    
//     const { name, goal, brand, language } = req.body;
    
//     const updatedAgent = await agentService.updateAgent(agentId, {
//       name,
//       goal,
//       brand,
//       language
//     });
    
//     res.json(updatedAgent);
//   } catch (error) {
//     console.error('Error updating agent:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route DELETE /api/agents/:id
//  */
// router.delete('/:id', async (req: Request, res: Response) => {
//   try {
//     const agentId = req.params.id;
//     const userId = getUserId(req);
//     const agent = await agentService.getAgentById(agentId);
    
//     if (agent.status === 'running') {
//       await agentManagerService.stopAgent(userId, agentId);
//     }
    
//     const deletedAgent = await agentService.deleteAgent(agentId);
//     res.json(deletedAgent);
//   } catch (error) {
//     console.error('Error deleting agent:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route POST /api/agents/:id/deploy
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/deploy', async (req: Request, res: Response) => {
//   const agentId = req.params.id;
//   const userId = getUserId(req);
  
//   try {
//     const agent = await agentService.getAgentWithTwitterAuth(agentId);

//     if (!agent) {
//       return res.status(404).json({ error: `Agent with ID ${agentId} not found` });
//     }
//     if (agent.userId !== userId) {
//       return res.status(403).json({ error: `Agent ${agentId} does not belong to user ${userId}` });
//     }

//     if (agent.status === 'running') {
//       return res.status(400).json({ error: 'Agent is already running' });
//     }

//     if (!agent.twitterAuth || !agent.twitterAuth.accessToken || !agent.twitterAuth.accessSecret) {
//       return res.status(400).json({ 
//         error: 'Twitter account not connected or credentials missing',
//         details: 'Please connect the agent to X first via the dashboard.'
//       });
//     }
    
//     const deployedAgent = await agentManagerService.deployAgent(userId, agentId);
    
//     try {
//        JSON.stringify(deployedAgent);
//     } catch (serializeError) {
//        return res.status(500).json({ 
//           error: 'Failed to serialize deployment result',
//           details: serializeError instanceof Error ? serializeError.message : String(serializeError)
//        });
//     }
    
//     return res.json({
//       message: `Agent ${deployedAgent.name} deployment initiated successfully`,
//       agent: deployedAgent 
//     });

//   } catch (error) {
//     console.error(`Deploy error for agent ${agentId}:`, error); 
//     return res.status(500).json({ 
//       error: 'Failed to deploy agent',
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// });

// /**
//  * @route POST /api/agents/:id/stop
//  */
// router.post('/:id/stop', async (req: Request, res: Response) => {
//   try {
//     const agentId = req.params.id;
//     const userId = getUserId(req);
    
//     const stoppedAgent = await agentManagerService.stopAgent(userId, agentId);
    
//     res.json({
//       message: `Agent ${stoppedAgent.name} stopped successfully`,
//       agent: stoppedAgent
//     });
//   } catch (error) {
//     console.error('Error stopping agent:', error);
//     res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route POST /api/agents/:id/tweet
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/tweet', async (req: Request, res: Response) => {
//   const agentId = req.params.id;
//   const userId = getUserId(req);
//   const { text, context } = req.body;

//   try {
//     if (!text) {
//       return res.status(400).json({ error: 'Tweet text is required' });
//     }
    
//     const agent = await agentService.getAgentWithTwitterAuth(agentId);
    
//     if (!agent) {
//       return res.status(404).json({ error: `Agent ${agentId} not found` });
//     }
//     if (agent.userId !== userId) {
//       return res.status(403).json({ error: `Agent ${agentId} does not belong to user ${userId}` });
//     }
    
//     if (agent.status !== 'running' && agent.status !== 'error') {
//       return res.status(400).json({ 
//         error: 'Agent must be running to post tweets',
//         agentStatus: agent.status
//       });
//     }

//     if (!agent.twitterAuth || !agent.twitterAuth.accessToken || !agent.twitterAuth.accessSecret) {
//       return res.status(401).json({ 
//         error: 'X Authentication Failed',
//         details: 'Agent is not connected to an X account or credentials are missing. Please connect/reconnect.'
//       });
//     }
    
//     const appKey = process.env.TWITTER_API_KEY;
//     const appSecret = process.env.TWITTER_API_SECRET;
//     const accessToken = agent.twitterAuth.accessToken;
//     const accessSecret = agent.twitterAuth.accessSecret;

//     if (!appKey || !appSecret) {
//       return res.status(500).json({ error: 'Server configuration error: Twitter app credentials missing.' });
//     }

//     const v2Client = new TwitterApi({
//       appKey,
//       appSecret,
//       accessToken,
//       accessSecret,
//     });

//     const postResult = await v2Client.v2.tweet({ text: text });
//     const postedTweetData = postResult.data;

//     const tweetUrl = `https://twitter.com/${agent.twitterAuth.twitterScreenName || 'user'}/status/${postedTweetData.id}`;
    
//     const savedTweet = await prisma.tweet.create({
//       data: {
//         agentId,
//         text: postedTweetData.text,
//         postTime: new Date(),
//         twitterTweetId: postedTweetData.id,
//         url: tweetUrl,
//         context: context || null
//       }
//     });
    
//     res.status(201).json({
//       message: 'Tweet posted successfully',
//       tweetId: savedTweet.tweetId,
//       twitterTweetId: postedTweetData.id,
//       url: tweetUrl
//     });

//   } catch (error: any) {
//     console.error(`Tweet error for agent ${agentId}:`, error);
    
//     if (error.code === 401) {
//        return res.status(401).json({ 
//          error: 'X Authentication Failed',
//          details: 'Stored X credentials might be invalid or revoked. Please reconnect the agent.'
//        });
//     }

//     res.status(500).json({ 
//       error: 'Failed to post tweet', 
//       details: error.message || String(error) 
//     });
//   }
// });

// /**
//  * @route POST /api/agents/:id/disconnect
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/disconnect', async (req: Request, res: Response) => {
//   try {
//     const userId = getUserId(req);
//     const agentId = req.params.id;

//     if (!agentId) {
//       return res.status(400).json({ error: 'Agent ID is required in route parameter' });
//     }

//     const updatedAgent = await agentService.disconnectTwitterForAgent(userId, agentId);

//     res.status(200).json({ 
//       message: 'Twitter account successfully disconnected from agent.',
//       agent: updatedAgent 
//     });
//   } catch (error) {
//     console.error(`Error disconnecting Twitter for agent ${req.params.id}:`, error);
    
//     if (error instanceof Error && (error.message.includes('not found') || error.message.includes('does not belong'))) {
//       return res.status(404).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Failed to disconnect Twitter account.', details: error instanceof Error ? error.message : String(error) });
//   }
// });

// /**
//  * @route POST /api/agents/:id/validate-deploy
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/validate-deploy', async (req: Request, res: Response) => {
//   const agentId = req.params.id;
//   const userId = getUserId(req);

//   try {
//     const agent = await agentService.getAgentWithTwitterAuth(agentId);

//     if (!agent) {
//       return res.status(404).json({ error: `Agent ${agentId} not found` });
//     }
//     if (agent.userId !== userId) {
//       return res.status(403).json({ error: `Agent ${agentId} does not belong to user ${userId}` });
//     }

//     const validCookies = await prisma.cookie.findMany({
//       where: {
//         userId,
//         OR: [
//           { expires: null },
//           { expires: { gt: new Date() } }
//         ]
//       }
//     });

//     if (!validCookies || validCookies.length === 0) {
//       return res.status(401).json({
//         error: 'X Authentication Failed',
//         details: 'No valid cookies found. Please add your Twitter cookies.'
//       });
//     }

//     try {
//       const cookieStrings = validCookies.map(cookie => 
//         `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
//           cookie.path || '/'
//         }; ${cookie.secure ? 'Secure' : ''}; ${
//           cookie.httpOnly ? 'HttpOnly' : ''
//         }; SameSite=${cookie.sameSite || 'Lax'}`
//       );

//       const api = new CustomTwitterApiWrapper({
//         cookiesPath: './data/cookies.json',
//         debug: false,
//       });

//       const scraper = api.getScraper();
//       await scraper.setCookies(cookieStrings);
      
//       const isLoggedIn = await scraper.isLoggedIn();
      
//       if (!isLoggedIn) {
//         return res.status(401).json({
//           error: 'X Authentication Failed',
//           details: 'Stored cookies appear to be invalid or expired.'
//         });
//       }
      
//     } catch (validationError: any) {
//       console.error(`Cookie validation failed for agent ${agentId}:`, validationError?.data || validationError);
//       return res.status(401).json({
//         error: 'X Authentication Failed',
//         details: 'Stored cookies appear to be invalid or expired.'
//       });
//     }

//     const deployedAgent = await agentManagerService.deployAgent(userId, agentId);

//     return res.json({
//       message: `Agent ${deployedAgent.name} deployed successfully using stored session.`,
//       agent: deployedAgent
//     });

//   } catch (error) {
//     console.error(`Validate-deploy error for agent ${agentId}:`, error);
//     return res.status(500).json({
//       error: 'Failed to validate session or deploy agent',
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// });

// /**
//  * @route POST /api/agents/:id/post-tweet
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/post-tweet', async (req: Request, res: Response) => {
//   const agentId = req.params.id;
//   const userId = getUserId(req);

//   try {
//     const agent = await prisma.agent.findUnique({
//       where: { agentId },
//       select: {
//         agentId: true,
//         name: true,
//         userId: true,
//         goal: true,
//         autoEngageEnabled: true,
//         autoEngageFrequencyHours: true,
//         autoEngageMaxReplies: true,
//         autoEngageMinScore: true,
//         autoEngageAutoReply: true,
//         lastAutoEngageTime: true,
//         twitterAuth: {
//           select: {
//             twitterScreenName: true
//           }
//         },
//         profile: {
//           select: {
//             userId: true,
//             planId: true,
//             profileCreatedAt: true,
//             stripeCustomerId: true,
//             customGenerationsUsed: true
//           }
//         }
//       }
//     });

//     if (!agent) {
//       return res.status(404).json({ error: `Agent ${agentId} not found` });
//     }
    
//     if (agent.userId !== userId) {
//       return res.status(403).json({ error: `Agent ${agentId} does not belong to user ${userId}` });
//     }

//     const tweetObj = req.body.tweet || req.body;
//     const text = tweetObj.text;
//     const replyToTweetId = tweetObj.replyToTweetId;
//     const context = tweetObj.context;

//     if (!text || typeof text !== 'string') {
//       return res.status(400).json({ 
//         error: "Invalid request body", 
//         details: "'text' is required and must be a string" 
//       });
//     }

//     const validCookies = await prisma.cookie.findMany({
//       where: {
//         userId,
//         OR: [
//           { expires: null },
//           { expires: { gt: new Date() } }
//         ]
//       }
//     });

//     if (!validCookies || validCookies.length === 0) {
//       return res.status(401).json({
//         error: "Twitter authentication required",
//         details: "No valid cookies found. Please add your Twitter cookies."
//       });
//     }

//     const api = new CustomTwitterApiWrapper({
//       cookiesPath: './data/cookies.json',
//       debug: process.env.NODE_ENV !== 'production'
//     });

//     const cookieStrings = validCookies.map(cookie => 
//       `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
//         cookie.path || '/'
//       }; ${cookie.secure ? 'Secure' : ''}; ${
//         cookie.httpOnly ? 'HttpOnly' : ''
//       }; SameSite=${cookie.sameSite || 'Lax'}`
//     );

//     const scraper = api.getScraper();
//     await scraper.setCookies(cookieStrings);
    
//     const isLoggedIn = await scraper.isLoggedIn();
//     if (!isLoggedIn) {
//       return res.status(401).json({
//         error: "X Authentication Failed",
//         details: "Stored cookies appear to be invalid or expired."
//       });
//     }

//     let tweetResponse;
//     try {
//       if (replyToTweetId) {
//         tweetResponse = await scraper.sendTweet(text, replyToTweetId);
//       } else {
//         tweetResponse = await scraper.sendTweet(text);
//       }
      
//       const responseText = await tweetResponse.text();
//       const responseData = JSON.parse(responseText);
      
//       if (!responseData?.data?.create_tweet?.tweet_results?.result?.rest_id) {
//         return res.status(500).json({
//           error: "Failed to extract tweet ID from response",
//           details: "Twitter API response structure was not as expected"
//         });
//       }
      
//       const tweetId = responseData.data.create_tweet.tweet_results.result.rest_id;
//       const timestamp = new Date();
      
//       const me = await scraper.me();
//       const username = me?.username || 'user';
//       const url = `https://twitter.com/${username}/status/${tweetId}`;
      
//       const savedTweet = await prisma.tweet.upsert({
//         where: {
//           twitterTweetId: tweetId
//         },
//         update: {
//           agentId,
//           text,
//           postTime: timestamp,
//           url,
//           context: context || null
//         },
//         create: {
//           agentId,
//           text,
//           postTime: timestamp,
//           twitterTweetId: tweetId,
//           url,
//           context: context || null
//         }
//       });
      
//       return res.status(201).json({
//         success: true,
//         message: "Tweet posted successfully",
//         tweet: {
//           dbId: savedTweet.tweetId,
//           twitterId: tweetId,
//           url,
//           text,
//           postedAt: timestamp
//         }
//       });
      
//     } catch (error) {
//       console.error(`Error posting tweet for agent ${agentId}:`, error);
//       return res.status(500).json({
//         error: "Failed to post tweet",
//         details: error instanceof Error ? error.message : String(error)
//       });
//     }
    
//   } catch (error) {
//     console.error(`Error processing post tweet request for agent ${agentId}:`, error);
//     return res.status(500).json({
//       error: "Failed to process post tweet request",
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// });

// /**
//  * @route POST /api/agents/:id/auto-engage
//  */
// // @ts-ignore - TypeScript incorrectly infers router.post overload
// router.post('/:id/auto-engage', async (req: Request, res: Response) => {
//   const agentId = req.params.id;
//   const userId = getUserId(req);

//   try {
//     const { action = 'trigger_cycle', dryRun = false } = req.body;

//     if (!['trigger_cycle', 'test_analysis'].includes(action)) {
//       return res.status(400).json({
//         error: "Invalid action. Must be 'trigger_cycle' or 'test_analysis'"
//       });
//     }

//     const agent = await prisma.agent.findUnique({
//       where: { agentId },
//       select: {
//         agentId: true,
//         name: true,
//         userId: true,
//         goal: true,
//         autoEngageEnabled: true,
//         autoEngageFrequencyHours: true,
//         autoEngageMaxReplies: true,
//         autoEngageMinScore: true,
//         autoEngageAutoReply: true,
//         lastAutoEngageTime: true,
//         twitterAuth: {
//           select: {
//             twitterScreenName: true
//           }
//         },
//         profile: {
//           select: {
//             userId: true,
//             planId: true,
//             profileCreatedAt: true,
//             stripeCustomerId: true,
//             customGenerationsUsed: true
//           }
//         }
//       }
//     });

//     if (!agent) {
//       return res.status(404).json({ error: `Agent ${agentId} not found` });
//     }

//     if (agent.userId !== userId) {
//       return res.status(403).json({ error: `Agent ${agentId} does not belong to user ${userId}` });
//     }

//     const validCookies = await prisma.cookie.findMany({
//       where: {
//         userId,
//         OR: [
//           { expires: null },
//           { expires: { gt: new Date() } }
//         ]
//       }
//     });

//     if (!validCookies || validCookies.length === 0) {
//       return res.status(401).json({
//         error: "Twitter authentication required",
//         details: "No valid cookies found. Please add your Twitter cookies."
//       });
//     }

//     const api = new CustomTwitterApiWrapper({
//       cookiesPath: './data/cookies.json',
//       debug: process.env.NODE_ENV !== 'production'
//     });

//     const cookieStrings = validCookies.map(cookie => 
//       `${cookie.key}=${cookie.value}; Domain=${cookie.domain || '.twitter.com'}; Path=${
//         cookie.path || '/'
//       }; ${cookie.secure ? 'Secure' : ''}; ${
//         cookie.httpOnly ? 'HttpOnly' : ''
//       }; SameSite=${cookie.sameSite || 'Lax'}`
//     );

//     const scraper = api.getScraper();
//     await scraper.setCookies(cookieStrings);
    
//     const isLoggedIn = await scraper.isLoggedIn();
//     if (!isLoggedIn) {
//       return res.status(401).json({
//         error: "Twitter Authentication Failed",
//         details: "Stored cookies appear to be invalid or expired."
//       });
//     }
    
//     const config = {
//       maxReplies: agent.autoEngageMaxReplies || 3,
//       frequencyHours: agent.autoEngageFrequencyHours || 4
//     };

//     let result;
    
//     if (action === 'trigger_cycle') {
//       result = await runAutoEngageCycle(agentId, userId, agent, scraper, config);
//     } else if (action === 'test_analysis') {
//       result = await analyzeTimelineForReplies(agentId, userId, agent, scraper, config);
//     }

//     if (!result.success) {
//       return res.status(400).json({
//         error: result.error || "Operation failed"
//       });
//     }

//     return res.json({
//       success: true,
//       message: action === 'trigger_cycle' ? "Auto-engage cycle completed successfully" : "Timeline analysis completed",
//       results: result.results || result
//     });

//   } catch (error) {
//     console.error(`Auto-engage error for agent ${agentId}:`, error);
//     return res.status(500).json({
//       error: "Failed to process auto-engage request",
//       details: error instanceof Error ? error.message : String(error)
//     });
//   }
// });

// // Helper functions
// async function runAutoEngageCycle(agentId: string, userId: string, agent: any, scraper: any, config: any) {
//   try {
//     const timelineResult = await fetchTimelineTweets(scraper, config.maxReplies);
//     if (!timelineResult.success) {
//       return { success: false, error: timelineResult.error };
//     }

//     const filteredTweets = await filterEligibleTweets(timelineResult.tweets, agentId, agent.twitterAuth?.twitterScreenName);
    
//     const repliesResult = await generateRepliesForTweets(filteredTweets, agent);
//     if (!repliesResult.success) {
//       return { success: false, error: repliesResult.error };
//     }

//     const postResult = await postRepliesToTwitter(agentId, scraper, repliesResult.replies, filteredTweets);
    
//     await prisma.agent.update({
//       where: { agentId },
//       data: { lastAutoEngageTime: new Date() }
//     });

//     const results = {
//       tweetsFetched: timelineResult.tweets.length,
//       tweetsFiltered: filteredTweets.length,
//       repliesGenerated: repliesResult.replies.length,
//       repliesPosted: postResult.posted || 0,
//       repliesFailed: postResult.failed || 0
//     };
    
//     return { success: true, results };

//   } catch (error) {
//     console.error(`Auto-Engage Cycle error for agent ${agentId}:`, error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : String(error) 
//     };
//   }
// }

// async function analyzeTimelineForReplies(agentId: string, userId: string, agent: any, scraper: any, config: any) {
//   try {
//     const timelineResult = await fetchTimelineTweets(scraper, config.maxReplies);
//     if (!timelineResult.success) {
//       return { success: false, error: timelineResult.error };
//     }

//     const filteredTweets = await filterEligibleTweets(timelineResult.tweets, agentId, agent.twitterAuth?.twitterScreenName);

//     const results = {
//       tweetsFetched: timelineResult.tweets.length,
//       tweetsEligible: filteredTweets.length,
//       tweetsAnalyzed: Math.min(filteredTweets.length, config.maxReplies)
//     };
    
//     return { success: true, results };

//   } catch (error) {
//     console.error(`Timeline Analysis error for agent ${agentId}:`, error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : String(error) 
//     };
//   }
// }

// async function fetchTimelineTweets(scraper: any, maxTweets: number) {
//   try {
//     const maxTweets = 10;
//     const timelineData = await scraper.fetchHomeTimeline(maxTweets, []);
    
//     if (!timelineData || timelineData.length === 0) {
//       return { success: true, tweets: [] };
//     }
    
//     const processedTweets = timelineData
//       .map(tweet => {
//         if (!tweet || !tweet.legacy) {
//           return null;
//         }
        
//         return {
//           id: tweet.rest_id,
//           text: tweet.legacy.full_text,
//           createdAt: tweet.legacy.created_at,
//           timeParsed: new Date(tweet.legacy.created_at),
//           user: tweet.core?.user_results?.result?.legacy ? {
//             id: tweet.core.user_results.result.legacy.id_str,
//             name: tweet.core.user_results.result.legacy.name,
//             screenName: tweet.core.user_results.result.legacy.screen_name,
//             username: tweet.core.user_results.result.legacy.screen_name,
//             profileImageUrl: tweet.core.user_results.result.legacy.profile_image_url_https,
//             avatar: tweet.core.user_results.result.legacy.profile_image_url_https,
//             verified: tweet.core.user_results.result.is_blue_verified || false,
//             isVerified: tweet.core.user_results.result.is_blue_verified || false
//           } : {
//             id: 'unknown',
//             name: 'Unknown User',
//             screenName: 'unknown',
//             username: 'unknown',
//             profileImageUrl: '',
//             avatar: '',
//             verified: false,
//             isVerified: false
//           },
//           replyCount: tweet.legacy.reply_count || 0,
//           replies: tweet.legacy.reply_count || 0,
//           retweetCount: tweet.legacy.retweet_count || 0,
//           retweets: tweet.legacy.retweet_count || 0,
//           favoriteCount: tweet.legacy.favorite_count || 0,
//           likes: tweet.legacy.favorite_count || 0,
//           isRetweet: !!tweet.legacy.retweeted_status_result,
//           isReply: !!tweet.legacy.in_reply_to_status_id_str,
//           userId: tweet.core?.user_results?.result?.legacy?.id_str || 'unknown'
//         };
//       })
//       .filter(Boolean)
//       .slice(0, maxTweets);

//     return { success: true, tweets: processedTweets };

//   } catch (error) {
//     console.error('Fetch Timeline error:', error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : String(error) 
//     };
//   }
// }

// async function filterEligibleTweets(tweets: any[], agentId: string, agentScreenName?: string) {
//   try {
//     const existingReplies = await prisma.reply.findMany({
//       where: {
//         agentId,
//         status: { in: ['posted', 'posting'] }
//       },
//       select: { originalTweetId: true }
//     });
    
//     const repliedTweetIds = new Set(existingReplies.map(r => r.originalTweetId));
    
//     const filteredTweets = tweets.filter(tweet => {
//       if (agentScreenName && tweet.user.screenName.toLowerCase() === agentScreenName.toLowerCase()) {
//         return false;
//       }
      
//       if (tweet.isRetweet) {
//         return false;
//       }
      
//       if (repliedTweetIds.has(tweet.id)) {
//         return false;
//       }
      
//       return true;
//     });

//     return filteredTweets;

//   } catch (error) {
//     console.error('Filter Tweets error:', error);
//     return [];
//   }
// }

// async function generateRepliesForTweets(tweets: any[], agent: any) {
//   try {
//     const { default: llmService } = await import('../llm-service');
    
//     const replies = [];
    
//     for (const tweet of tweets) {
//       try {
//         const tweetContext = `Author: @${tweet.user.screenName} (${tweet.user.name})\nTweet: "${tweet.text}"`;
//         const replyText = await llmService.generateTweetReply(agent.agentId, tweetContext, agent);
        
//         if (replyText) {
//           replies.push({
//             tweetId: tweet.id,
//             replyText: replyText,
//             originalTweet: tweet
//           });
//         }
        
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//       } catch (error) {
//         console.error(`Error generating reply for tweet ${tweet.id}:`, error);
//       }
//     }
    
//     return { success: true, replies };

//   } catch (error) {
//     console.error('Generate Replies error:', error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : String(error) 
//     };
//   }
// }

// async function postRepliesToTwitter(agentId: string, scraper: any, replies: any[], originalTweets: any[]) {
//   try {
//     let posted = 0;
//     let failed = 0;
    
//     for (const reply of replies) {
//       try {
//         const originalTweet = originalTweets.find(t => t.id === reply.tweetId);
//         if (!originalTweet) continue;
        
//         const savedReply = await prisma.reply.create({
//           data: {
//             agentId,
//             originalTweetId: originalTweet.id,
//             originalTweetText: originalTweet.text,
//             originalTweetUser: originalTweet.user.screenName,
//             replyText: reply.replyText,
//             status: 'posting',
//             score: 0,
//             confidence: 1.0
//           }
//         });
        
//         const replyResponse = await scraper.sendTweet(reply.replyText, reply.tweetId);
        
//         if (replyResponse) {
//           let twitterReplyId: string | null = null;
//           try {
//             const responseData = await replyResponse.json();
//             twitterReplyId = responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
//           } catch (parseError) {
//             console.warn('Could not parse reply ID from response');
//           }
          
//           await prisma.reply.update({
//             where: { replyId: savedReply.replyId },
//             data: { 
//               status: 'posted',
//               postedTime: new Date(),
//               twitterReplyId
//             }
//           });
          
//           posted++;
//         } else {
//           await prisma.reply.update({
//             where: { replyId: savedReply.replyId },
//             data: { status: 'failed' }
//           });
          
//           failed++;
//         }
        
//         await new Promise(resolve => setTimeout(resolve, 2000));
        
//       } catch (error) {
//         failed++;
//         console.error(`Error posting reply to tweet ${reply.tweetId}:`, error);
//       }
//     }
    
//     return { success: true, posted, failed };

//   } catch (error) {
//     console.error('Post Replies error:', error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : String(error) 
//     };
//   }
// }

// export default router;
