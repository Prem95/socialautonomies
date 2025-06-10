#!/usr/bin/env node

/**
 * Security Audit Script for API Endpoints
 * Identifies potential sensitive data exposure in API responses
 */

const fs = require('fs');
const path = require('path');

// List of sensitive fields that should NOT be exposed to client-side
const SENSITIVE_FIELDS = [
  'stripeCustomerId',
  'stripeSubscriptionId',
  'stripePriceId',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'apiKey',
  'privateKey',
  'secret',
  'sessionToken',
  'oauth_token_secret',
  'oauth_verifier'
];

// Patterns that might indicate sensitive data (excluding legitimate public fields)
const SENSITIVE_PATTERNS = [
  /stripe[A-Z][a-zA-Z]*/g,
  /password[A-Z][a-zA-Z]*/g,
  /(?<!oauth_)token[A-Z][a-zA-Z]*/g, // Exclude oauth_token which can be public
  /secret[A-Z][a-zA-Z]*/g,
  /key[A-Z][a-zA-Z]*/g
];

// Fields that are legitimate to expose (whitelist)
const LEGITIMATE_FIELDS = [
  'authUrl',     // OAuth redirect URLs are meant to be public
  'authLink',    // OAuth links are public
  'stripePriceId', // Public price IDs are safe to expose in some contexts
];

// Get all API route files
function getAPIRoutes(dir) {
  const routes = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      routes.push(...getAPIRoutes(filePath));
    } else if (file === 'route.ts' || file === 'route.js') {
      routes.push(filePath);
    }
  }
  
  return routes;
}

// Analyze a single route file for sensitive data exposure
function analyzeRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for NextResponse.json() calls
  const responseMatches = content.match(/NextResponse\.json\s*\(\s*([^)]+)\s*\)/g);
  
  if (responseMatches) {
    responseMatches.forEach((match, index) => {
      // Extract the response object
      const responseContent = match.substring(match.indexOf('(') + 1, match.lastIndexOf(')')).trim();
      
      // Check for sensitive fields
      SENSITIVE_FIELDS.forEach(field => {
        if (responseContent.includes(field)) {
          issues.push({
            type: 'SENSITIVE_FIELD',
            field,
            line: getLineNumber(content, match),
            context: match.substring(0, 100) + '...'
          });
        }
      });
      
      // Check for sensitive patterns
      SENSITIVE_PATTERNS.forEach(pattern => {
        const matches = responseContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (!SENSITIVE_FIELDS.includes(match) && !LEGITIMATE_FIELDS.includes(match)) {
              issues.push({
                type: 'SENSITIVE_PATTERN',
                pattern: pattern.toString(),
                match,
                line: getLineNumber(content, responseContent),
                context: responseContent.substring(0, 100) + '...'
              });
            }
          });
        }
      });
    });
  }
  
  return issues;
}

// Get line number of a match in content
function getLineNumber(content, match) {
  const lines = content.substring(0, content.indexOf(match)).split('\n');
  return lines.length;
}

// Main audit function
function runSecurityAudit() {
  console.log('🔍 Starting Security Audit for API Endpoints...\n');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  if (!fs.existsSync(apiDir)) {
    console.error('❌ API directory not found:', apiDir);
    return;
  }
  
  const routes = getAPIRoutes(apiDir);
  let totalIssues = 0;
  
  routes.forEach(route => {
    const issues = analyzeRoute(route);
    if (issues.length > 0) {
      console.log(`🚨 ${route}:`);
      issues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.field || issue.match} (line ${issue.line})`);
        console.log(`    Context: ${issue.context}`);
      });
      console.log('');
      totalIssues += issues.length;
    }
  });
  
  if (totalIssues === 0) {
    console.log('✅ No obvious sensitive data exposure found in API routes!');
  } else {
    console.log(`🔴 Found ${totalIssues} potential security issues across ${routes.length} API routes.`);
    console.log('\n📋 Recommendations:');
    console.log('1. Remove sensitive fields from API responses');
    console.log('2. Create separate internal/external data models');
    console.log('3. Use data transformation layers');
    console.log('4. Implement proper access controls');
  }
  
  console.log(`\n🔍 Audited ${routes.length} API route files.`);
}

// Run the audit
if (require.main === module) {
  runSecurityAudit();
}

module.exports = { runSecurityAudit, SENSITIVE_FIELDS, SENSITIVE_PATTERNS }; 