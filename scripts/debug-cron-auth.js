#!/usr/bin/env node

// Load environment variables from .env files
require('dotenv').config();

/**
 * Debug Cron Authentication
 * 
 * Helps diagnose cron authentication issues in production
 */

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function checkEnvironment() {
  log(COLORS.cyan, '\n🔍 Environment Variables Check');
  log(COLORS.cyan, '='.repeat(50));
  
  // Check critical environment variables
  const envVars = [
    'NODE_ENV',
    'CRON_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName.includes('SECRET') || varName.includes('URL') 
        ? `${value.substring(0, 10)}...` 
        : value;
      log(COLORS.green, `✅ ${varName}: ${displayValue}`);
    } else {
      log(COLORS.red, `❌ ${varName}: NOT SET`);
    }
  });
}

async function testCronEndpoint() {
  log(COLORS.cyan, '\n🌐 Cron Endpoint Test');
  log(COLORS.cyan, '='.repeat(50));
  
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;
  
  // Test all three cron endpoints
  const endpoints = [
    '/api/cron/scheduled-tweets',
    '/api/cron/auto-tweets',
    '/api/cron/auto-engage'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseURL}${endpoint}`;
    
    log(COLORS.blue, `\n📞 Testing: ${endpoint}`);
    
    try {
      // Test without auth header
      log(COLORS.yellow, '  🔓 Testing without auth...');
      let response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Debug-Script'
        }
      });
      
      log(COLORS.yellow, `     Status: ${response.status}`);
      
      // Test with auth header (if CRON_SECRET exists)
      if (cronSecret) {
        log(COLORS.yellow, '  🔐 Testing with auth...');
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Debug-Script',
            'Authorization': `Bearer ${cronSecret}`
          }
        });
        
        const responseText = await response.text();
        
        if (response.ok) {
          log(COLORS.green, `     ✅ Status: ${response.status} - SUCCESS`);
        } else {
          log(COLORS.red, `     ❌ Status: ${response.status} - ${responseText}`);
        }
      } else {
        log(COLORS.yellow, '     ⚠️  No CRON_SECRET to test with');
      }
      
    } catch (error) {
      log(COLORS.red, `     ❌ Error: ${error.message}`);
    }
  }
}

async function generateCronSecret() {
  log(COLORS.cyan, '\n🔑 Generate CRON_SECRET');
  log(COLORS.cyan, '='.repeat(50));
  
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('hex');
  
  log(COLORS.bright, 'Add this to your .env file:');
  log(COLORS.green, `CRON_SECRET=${secret}`);
  
  log(COLORS.yellow, '\nDon\'t forget to:');
  log(COLORS.yellow, '1. Add CRON_SECRET to your production environment');
  log(COLORS.yellow, '2. Restart your application after adding the secret');
  log(COLORS.yellow, '3. Make sure both web server and cron simulator can access it');
}

async function main() {
  const command = process.argv[2];
  
  log(COLORS.bright, '🚀 Cron Authentication Debugger');
  
  switch (command) {
    case 'env':
      await checkEnvironment();
      break;
      
    case 'test':
      await checkEnvironment();
      await testCronEndpoint();
      break;
      
    case 'generate':
      await generateCronSecret();
      break;
      
    default:
      log(COLORS.bright, '\n📚 Available Commands:');
      console.log(`
${COLORS.cyan}Commands:${COLORS.reset}
  env       Check environment variables
  test      Test cron endpoints with/without auth
  generate  Generate a new CRON_SECRET
  
${COLORS.cyan}Examples:${COLORS.reset}
  npm run debug:cron env
  npm run debug:cron test
  npm run debug:cron generate
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 