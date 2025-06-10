// Import command.ts first to define PLATFORM_NODE
import './command';

import 'dotenv/config';
import { startServer } from './api/server';

async function main() {
  try {    
    console.log('Starting API server...');
    await startServer();
    console.log('Server started successfully.');
    
  } catch (error: any) {
    console.error('Error starting server:', error.message);
    process.exit(1);
  }
}

main();
