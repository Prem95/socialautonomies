#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { AgentConfig } from '../api/agent-helpers';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Template for a new agent configuration
const templateConfig: AgentConfig = {
  name: 'New AI Agent',
  goal: 'To provide helpful information on a specific topic',
  brand: {
    voice: 'professional',
    personality: 'friendly and informative',
    values: ['accuracy', 'helpfulness', 'clarity']
  },
  special_hooks: {
    intro_phrases: ['In my analysis,', 'Here\'s what I know:'],
    signature_closings: ['What do you think?', 'Thoughts?'],
    topics_to_focus: ['technology', 'science', 'education'],
    topics_to_avoid: ['politics', 'religion', 'controversial topics']
  },
  language: 'en-US',
  example_user_question: 'What can you tell me about this topic?',
  example_agent_reply: 'Here\'s what I know about this topic based on my analysis...'
};

// Ask a question and return the answer
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

// Ask a question with a default value
async function questionWithDefault(query: string, defaultValue: string): Promise<string> {
  const answer = await question(`${query} (default: ${defaultValue}): `);
  return answer.trim() === '' ? defaultValue : answer;
}

// Ask for an array of items
async function questionArray(query: string, defaultValues: string[]): Promise<string[]> {
  const answer = await question(`${query} (comma-separated, default: ${defaultValues.join(', ')}): `);
  if (answer.trim() === '') {
    return defaultValues;
  }
  return answer.split(',').map(item => item.trim());
}

// Main function to create or edit an agent configuration
async function configureAgent() {
  console.log('=== X Agent Configuration Tool ===');
  console.log('This tool helps you create or edit an agent configuration for generating tweets.');
  console.log('The configuration will be saved as a JSON file that you can use with the X API.');
  console.log('');

  // Ask for the output file path
  const defaultFilePath = path.resolve(process.cwd(), 'agent-config.json');
  const filePath = await questionWithDefault('Where would you like to save the configuration?', defaultFilePath);
  
  // Check if the file exists
  let config: AgentConfig = { ...templateConfig };
  if (fs.existsSync(filePath)) {
    const loadExisting = await question('Configuration file already exists. Would you like to edit it? (y/n): ');
    if (loadExisting.toLowerCase() === 'y') {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        config = JSON.parse(fileContent);
        console.log('Loaded existing configuration.');
      } catch (error) {
        console.error('Error loading file:', error);
        console.log('Starting with template configuration instead.');
      }
    }
  }

  // Basic information
  console.log('\n=== Basic Information ===');
  config.name = await questionWithDefault('Agent name', config.name);
  config.goal = await questionWithDefault('Agent goal', config.goal);
  config.language = await questionWithDefault('Language code', config.language);

  // Brand
  console.log('\n=== Brand Information ===');
  config.brand.voice = await questionWithDefault('Brand voice', config.brand.voice);
  config.brand.personality = await questionWithDefault('Brand personality', config.brand.personality);
  config.brand.values = await questionArray('Brand values', config.brand.values);

  // Special hooks
  console.log('\n=== Special Hooks ===');
  config.special_hooks.intro_phrases = await questionArray('Introduction phrases', config.special_hooks.intro_phrases);
  config.special_hooks.signature_closings = await questionArray('Signature closings', config.special_hooks.signature_closings);
  config.special_hooks.topics_to_focus = await questionArray('Topics to focus on', config.special_hooks.topics_to_focus);
  config.special_hooks.topics_to_avoid = await questionArray('Topics to avoid', config.special_hooks.topics_to_avoid);

  // Examples
  console.log('\n=== Examples ===');
  config.example_user_question = await questionWithDefault('Example user question', config.example_user_question);
  config.example_agent_reply = await questionWithDefault('Example agent reply', config.example_agent_reply);

  // Save the configuration
  try {
    // Create the directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the configuration to the file
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log(`\nConfiguration saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving configuration:', error);
  }

  // Close the readline interface
  rl.close();
}

// Run the main function
configureAgent().catch(console.error); 