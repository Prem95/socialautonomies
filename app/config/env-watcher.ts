/**
 * Environment Variable Hot Reload Service
 * 
 * Watches .env files for changes and reloads environment variables
 * without requiring a server restart.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { envLog } from '@/lib/logger';

interface EnvChangeHandler {
  (changes: { [key: string]: { old: string | undefined; new: string | undefined } }): void;
}

class EnvWatcher {
  private watchers: fs.FSWatcher[] = [];
  private handlers: EnvChangeHandler[] = [];
  private currentEnv: { [key: string]: string } = {};
  private envFiles: string[] = [];

  constructor() {
    this.envFiles = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '.env.production'),
    ].filter(file => fs.existsSync(file));

    this.loadInitialEnv();
  }

  private loadInitialEnv() {
    this.currentEnv = { ...process.env };
  }

  /**
   * Start watching environment files
   */
  startWatching() {
    if (process.env.NODE_ENV === 'production') {
      envLog.info('Skipping file watching in production mode');
      return;
    }

    this.envFiles.forEach(envFile => {
      envLog.info(`Watching ${envFile}`);
      
      const watcher = fs.watchFile(envFile, { interval: 1000 }, () => {
        this.handleEnvFileChange(envFile);
      });
      
      this.watchers.push(watcher as any);
    });

    envLog.success(`Started watching ${this.envFiles.length} environment files`);
  }

  /**
   * Stop watching environment files
   */
  stopWatching() {
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    });
    this.watchers = [];
    console.log('[EnvWatcher] Stopped watching environment files');
  }

  /**
   * Handle environment file changes
   */
  private handleEnvFileChange(filePath: string) {
    try {
      console.log(`[EnvWatcher] Environment file changed: ${filePath}`);
      
      // Parse the changed file
      const result = dotenv.config({ path: filePath });
      
      if (result.error) {
        console.error(`[EnvWatcher] Error parsing ${filePath}:`, result.error);
        return;
      }

      // Detect changes
      const changes: { [key: string]: { old: string | undefined; new: string | undefined } } = {};
      const newEnv = result.parsed || {};

      // Check for added/modified variables
      Object.keys(newEnv).forEach(key => {
        const oldValue = this.currentEnv[key];
        const newValue = newEnv[key];
        
        if (oldValue !== newValue) {
          changes[key] = { old: oldValue, new: newValue };
          // Update process.env
          process.env[key] = newValue;
          this.currentEnv[key] = newValue;
        }
      });

      // Check for removed variables
      Object.keys(this.currentEnv).forEach(key => {
        if (!(key in newEnv) && key in process.env) {
          changes[key] = { old: this.currentEnv[key], new: undefined };
          delete process.env[key];
          delete this.currentEnv[key];
        }
      });

      if (Object.keys(changes).length > 0) {
        console.log('[EnvWatcher] Environment changes detected:', Object.keys(changes));
        
        // Notify handlers
        this.handlers.forEach(handler => {
          try {
            handler(changes);
          } catch (error) {
            console.error('[EnvWatcher] Error in change handler:', error);
          }
        });
      }

    } catch (error) {
      console.error(`[EnvWatcher] Error handling file change for ${filePath}:`, error);
    }
  }

  /**
   * Register a handler for environment changes
   */
  onEnvChange(handler: EnvChangeHandler) {
    this.handlers.push(handler);
  }

  /**
   * Manually reload environment variables
   */
  reloadEnv() {
    this.envFiles.forEach(envFile => {
      this.handleEnvFileChange(envFile);
    });
  }

  /**
   * Get current environment variable
   */
  getEnv(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Check if environment variable exists
   */
  hasEnv(key: string): boolean {
    return key in process.env;
  }
}

// Singleton instance
const envWatcher = new EnvWatcher();

// Register handlers for critical services
envWatcher.onEnvChange((changes) => {
  const criticalVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];

  const criticalChanges = Object.keys(changes).filter(key => 
    criticalVars.includes(key)
  );

  if (criticalChanges.length > 0) {
    console.log('[EnvWatcher] Critical environment variables changed:', criticalChanges);
    
    // You could implement specific reload logic here
    // For example, reinitialize services that depend on these variables
    
    criticalChanges.forEach(key => {
      const change = changes[key];
      console.log(`[EnvWatcher] ${key}: "${change.old}" -> "${change.new}"`);
    });
  }
});

export default envWatcher; 