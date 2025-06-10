/**
 * Centralized Logging System
 * 
 * Provides structured logging with file output and console fallback
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: any;
}

class Logger {
  private logsDir: string;
  private ensureLogsDir: boolean = false;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.createLogsDirectory();
  }

  private createLogsDirectory() {
    if (!this.ensureLogsDir) {
      try {
        if (!fs.existsSync(this.logsDir)) {
          fs.mkdirSync(this.logsDir, { recursive: true });
        }
        this.ensureLogsDir = true;
      } catch (error) {
        console.error('Failed to create logs directory:', error);
      }
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const metadata = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}${metadata}\n`;
  }

  private getLogColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[2m',    // dim
      info: '\x1b[36m',     // cyan
      warn: '\x1b[33m',     // yellow
      error: '\x1b[31m',    // red
      success: '\x1b[32m'   // green
    };
    return colors[level] || '\x1b[0m';
  }

  private writeToFile(service: string, entry: LogEntry) {
    if (!this.ensureLogsDir) return;

    try {
      const logFile = path.join(this.logsDir, `${service}.log`);
      const combinedLogFile = path.join(this.logsDir, 'combined.log');
      
      const formattedEntry = this.formatLogEntry(entry);
      
      // Write to service-specific log
      fs.appendFileSync(logFile, formattedEntry);
      
      // Write to combined log
      fs.appendFileSync(combinedLogFile, formattedEntry);
      
      // Error logs also go to error-specific file
      if (entry.level === 'error') {
        const errorLogFile = path.join(this.logsDir, 'error.log');
        fs.appendFileSync(errorLogFile, formattedEntry);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, service: string, message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      metadata
    };

    // Write to file
    this.writeToFile(service, entry);

    // Also output to console in development
    if (process.env.NODE_ENV === 'development') {
      const color = this.getLogColor(level);
      const reset = '\x1b[0m';
      const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
      console.log(`${color}[${service}] ${message}${metadataStr}${reset}`);
    }
  }

  // Service-specific loggers
  cron(level: LogLevel, message: string, metadata?: any) {
    this.log(level, 'cron', message, metadata);
  }

  web(level: LogLevel, message: string, metadata?: any) {
    this.log(level, 'web', message, metadata);
  }

  health(level: LogLevel, message: string, metadata?: any) {
    this.log(level, 'health', message, metadata);
  }

  env(level: LogLevel, message: string, metadata?: any) {
    this.log(level, 'env-watcher', message, metadata);
  }

  api(level: LogLevel, message: string, metadata?: any) {
    this.log(level, 'api', message, metadata);
  }

  // Log rotation (basic implementation)
  rotateLogs(maxSizeMB: number = 10) {
    if (!this.ensureLogsDir) return;

    try {
      const logFiles = fs.readdirSync(this.logsDir).filter(file => file.endsWith('.log'));
      
      logFiles.forEach(logFile => {
        const filePath = path.join(this.logsDir, logFile);
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > maxSizeMB) {
          const timestamp = new Date().toISOString().split('T')[0];
          const rotatedName = logFile.replace('.log', `-${timestamp}.log`);
          const rotatedPath = path.join(this.logsDir, rotatedName);
          
          fs.renameSync(filePath, rotatedPath);
          this.log('info', 'logger', `Rotated log file: ${logFile} -> ${rotatedName}`);
        }
      });
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  // Clean old logs (keep last N days)
  cleanOldLogs(retentionDays: number = 30) {
    if (!this.ensureLogsDir) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const logFiles = fs.readdirSync(this.logsDir);
      
      logFiles.forEach(logFile => {
        const filePath = path.join(this.logsDir, logFile);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate && logFile.includes('-')) {
          fs.unlinkSync(filePath);
          this.log('info', 'logger', `Cleaned old log file: ${logFile}`);
        }
      });
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

// Singleton instance
const logger = new Logger();

// Export convenience functions
export const cronLog = {
  debug: (message: string, metadata?: any) => logger.cron('debug', message, metadata),
  info: (message: string, metadata?: any) => logger.cron('info', message, metadata),
  warn: (message: string, metadata?: any) => logger.cron('warn', message, metadata),
  error: (message: string, metadata?: any) => logger.cron('error', message, metadata),
  success: (message: string, metadata?: any) => logger.cron('success', message, metadata),
};

export const webLog = {
  debug: (message: string, metadata?: any) => logger.web('debug', message, metadata),
  info: (message: string, metadata?: any) => logger.web('info', message, metadata),
  warn: (message: string, metadata?: any) => logger.web('warn', message, metadata),
  error: (message: string, metadata?: any) => logger.web('error', message, metadata),
  success: (message: string, metadata?: any) => logger.web('success', message, metadata),
};

export const healthLog = {
  debug: (message: string, metadata?: any) => logger.health('debug', message, metadata),
  info: (message: string, metadata?: any) => logger.health('info', message, metadata),
  warn: (message: string, metadata?: any) => logger.health('warn', message, metadata),
  error: (message: string, metadata?: any) => logger.health('error', message, metadata),
  success: (message: string, metadata?: any) => logger.health('success', message, metadata),
};

export const envLog = {
  debug: (message: string, metadata?: any) => logger.env('debug', message, metadata),
  info: (message: string, metadata?: any) => logger.env('info', message, metadata),
  warn: (message: string, metadata?: any) => logger.env('warn', message, metadata),
  error: (message: string, metadata?: any) => logger.env('error', message, metadata),
  success: (message: string, metadata?: any) => logger.env('success', message, metadata),
};

export const apiLog = {
  debug: (message: string, metadata?: any) => logger.api('debug', message, metadata),
  info: (message: string, metadata?: any) => logger.api('info', message, metadata),
  warn: (message: string, metadata?: any) => logger.api('warn', message, metadata),
  error: (message: string, metadata?: any) => logger.api('error', message, metadata),
  success: (message: string, metadata?: any) => logger.api('success', message, metadata),
};

export default logger; 