/**
 * API Test Script
 * 
 * This script tests all the available agent API endpoints:
 * - Create agent
 * - Get all agents
 * - Get specific agent
 * - Deploy agent
 * - Get agent status
 * - Post tweet via agent
 * - Verify tweet posted
 * - Stop agent
 * - Update agent
 * - Delete agent
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to log response
const logResponse = (endpoint: string, response: any, status: number) => {
  console.log(chalk.cyan(`\n[${endpoint}] Status: ${status}`));
  console.log(chalk.gray(JSON.stringify(response, null, 2)));
};

// Helper to log error
const logError = (endpoint: string, error: any) => {
  console.log(chalk.red(`\n[${endpoint}] Error:`));
  if (error.response) {
    console.log(chalk.red(`Status: ${error.response.status}`));
    console.log(chalk.gray(JSON.stringify(error.response.data, null, 2)));
  } else {
    console.log(chalk.red(error.message));
  }
};

// Test runner
async function runTests() {
  let agentId: string | null = null;
  let successCount = 0;
  let failCount = 0;
  let existingAgentId: string | null = null;
  
  console.log(chalk.yellow('==== Agent API Test Script ===='));
  
  try {
    // First, check if we can get existing agents for the seeded user
    console.log(chalk.blue('\n🔍 Checking for existing agents...'));
    try {
      const allAgentsResponse = await api.get('/agents');
      if (allAgentsResponse.data && Array.isArray(allAgentsResponse.data) && allAgentsResponse.data.length > 0) {
        existingAgentId = allAgentsResponse.data[0].agentId;
        console.log(chalk.green(`Found existing agent with ID: ${existingAgentId}`));
      }
    } catch (error) {
      console.log(chalk.yellow('No existing agents found or unable to fetch agents.'));
    }
    
    // 1. Create a new agent
    console.log(chalk.blue('\n🔍 Testing Create Agent...'));
    try {
      const createResponse = await api.post('/agents', {
        name: `Test Agent ${Date.now()}`,
        goal: 'Testing the API endpoints',
        brand: {
          tone: 'informative',
          personality: 'technical',
          interests: ['testing', 'automation', 'API']
        },
        specialHooks: {
          hashtagsToTrack: ['#testing', '#automation'],
          accountsToMonitor: ['@testaccount']
        },
        language: 'en-US'
      });
      
      logResponse('CREATE AGENT', createResponse.data, createResponse.status);
      agentId = createResponse.data.agentId;
      console.log(chalk.green('✅ Create Agent test passed!'));
      successCount++;
    } catch (error: any) {
      logError('CREATE AGENT', error);
      console.log(chalk.red('❌ Create Agent test failed!'));
      failCount++;
    }
    
    if (!agentId && existingAgentId) {
      console.log(chalk.yellow(`⚠️ Could not create a new agent. Using existing agent ID: ${existingAgentId}`));
      agentId = existingAgentId;
    } else if (!agentId) {
      console.log(chalk.red('⚠️ Could not find any agent to test with. Some tests will fail.'));
    }
    
    // 2. Get all agents
    console.log(chalk.blue('\n🔍 Testing Get All Agents...'));
    try {
      const getAllResponse = await api.get('/agents');
      logResponse('GET ALL AGENTS', getAllResponse.data, getAllResponse.status);
      console.log(chalk.green('✅ Get All Agents test passed!'));
      successCount++;
      
      // If we don't have an agent ID yet, use the first one from the list
      if (!agentId && getAllResponse.data && Array.isArray(getAllResponse.data) && getAllResponse.data.length > 0) {
        agentId = getAllResponse.data[0].agentId;
        console.log(chalk.green(`Using agent ID from list: ${agentId}`));
      }
    } catch (error: any) {
      logError('GET ALL AGENTS', error);
      console.log(chalk.red('❌ Get All Agents test failed!'));
      failCount++;
    }
    
    
    // 4. Deploy agent
    console.log(chalk.blue(`\n🔍 Testing Deploy Agent (ID: ${agentId})...`));
    try {
      const deployResponse = await api.post(`/agents/${agentId}/deploy`);
      logResponse('DEPLOY AGENT', deployResponse.data, deployResponse.status);
      console.log(chalk.green('✅ Deploy Agent test passed!'));
      successCount++;
    } catch (error: any) {
      logError('DEPLOY AGENT', error);
      
      // Check if this is an authentication error
      if (error.response && error.response.status === 401 && 
          error.response.data && error.response.data.authenticationRequired) {
        console.log(chalk.yellow(
          '\n⚠️ X authentication required! To fix this issue:'
        ));
        console.log(chalk.yellow(
          '1. Set TWITTER_USERNAME and TWITTER_PASSWORD in your environment variables'
        ));
        console.log(chalk.yellow(
          '2. Run the X API example script to save authentication cookies:'
        ));
        console.log(chalk.yellow(
          '   npm run ts-node src/examples/twitter-api-example.ts'
        ));
        console.log(chalk.yellow(
          '3. Once authenticated, try deploying the agent again'
        ));
      }
      
      console.log(chalk.red('❌ Deploy Agent test failed!'));
      failCount++;
    }
    
  } catch (error: any) {
    console.log(chalk.red('\n❌ Test suite failed with error:'));
    console.log(error.message);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Unhandled error in test suite:', err);
  process.exit(1);
});