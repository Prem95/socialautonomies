#!/usr/bin/env node

/**
 * Log Management Utility
 * 
 * Provides commands for viewing, rotating, and cleaning application logs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGS_DIR = path.join(process.cwd(), 'logs');
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    log(COLORS.green, '✅ Created logs directory');
  }
}

function getLogFiles() {
  if (!fs.existsSync(LOGS_DIR)) {
    return [];
  }
  return fs.readdirSync(LOGS_DIR).filter(file => file.endsWith('.log'));
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getLogFileInfo() {
  const logFiles = getLogFiles();
  const info = [];
  
  logFiles.forEach(file => {
    const filePath = path.join(LOGS_DIR, file);
    const stats = fs.statSync(filePath);
    info.push({
      name: file,
      size: formatFileSize(stats.size),
      modified: stats.mtime.toISOString(),
      lines: fs.readFileSync(filePath, 'utf8').split('\n').length - 1
    });
  });
  
  return info.sort((a, b) => a.name.localeCompare(b.name));
}

function showStatus() {
  log(COLORS.cyan, '\n📊 Log Status Report');
  log(COLORS.cyan, '='.repeat(50));
  
  const logInfo = getLogFileInfo();
  
  if (logInfo.length === 0) {
    log(COLORS.yellow, '⚠️  No log files found');
    return;
  }
  
  const table = logInfo.map(info => ({
    File: info.name,
    Size: info.size,
    Lines: info.lines.toLocaleString(),
    'Last Modified': new Date(info.modified).toLocaleString()
  }));
  
  console.table(table);
  
  const totalSize = logInfo.reduce((sum, info) => {
    const filePath = path.join(LOGS_DIR, info.name);
    return sum + fs.statSync(filePath).size;
  }, 0);
  
  log(COLORS.bright, `\n📈 Total logs size: ${formatFileSize(totalSize)}`);
}

function tailLogs(logFile = 'combined.log', lines = 50) {
  const filePath = path.join(LOGS_DIR, logFile);
  
  if (!fs.existsSync(filePath)) {
    log(COLORS.red, `❌ Log file not found: ${logFile}`);
    return;
  }
  
  log(COLORS.green, `\n📜 Tailing ${logFile} (last ${lines} lines):`);
  log(COLORS.cyan, '='.repeat(60));
  
  try {
    const output = execSync(`tail -n ${lines} "${filePath}"`, { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    log(COLORS.red, `❌ Error reading log file: ${error.message}`);
  }
}

function followLogs(logFile = 'combined.log') {
  const filePath = path.join(LOGS_DIR, logFile);
  
  if (!fs.existsSync(filePath)) {
    log(COLORS.red, `❌ Log file not found: ${logFile}`);
    return;
  }
  
  log(COLORS.green, `\n👁️  Following ${logFile} (Press Ctrl+C to stop):`);
  log(COLORS.cyan, '='.repeat(60));
  
  try {
    execSync(`tail -f "${filePath}"`, { stdio: 'inherit' });
  } catch (error) {
    // User pressed Ctrl+C
    log(COLORS.yellow, '\n👋 Stopped following logs');
  }
}

function rotateLogs(maxSizeMB = 10) {
  log(COLORS.blue, `\n🔄 Rotating logs larger than ${maxSizeMB}MB...`);
  
  const logFiles = getLogFiles().filter(file => !file.includes('-')); // Skip already rotated files
  let rotatedCount = 0;
  
  logFiles.forEach(logFile => {
    const filePath = path.join(LOGS_DIR, logFile);
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      const timestamp = new Date().toISOString().split('T')[0];
      const rotatedName = logFile.replace('.log', `-${timestamp}.log`);
      const rotatedPath = path.join(LOGS_DIR, rotatedName);
      
      // Check if rotated file already exists for today
      if (fs.existsSync(rotatedPath)) {
        const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
        const uniqueName = logFile.replace('.log', `-${timestamp}-${time}.log`);
        const uniquePath = path.join(LOGS_DIR, uniqueName);
        fs.renameSync(filePath, uniquePath);
        log(COLORS.green, `✅ Rotated: ${logFile} → ${uniqueName}`);
      } else {
        fs.renameSync(filePath, rotatedPath);
        log(COLORS.green, `✅ Rotated: ${logFile} → ${rotatedName}`);
      }
      
      rotatedCount++;
    }
  });
  
  if (rotatedCount === 0) {
    log(COLORS.yellow, '⚠️  No logs needed rotation');
  } else {
    log(COLORS.green, `✅ Rotated ${rotatedCount} log files`);
  }
}

function cleanOldLogs(retentionDays = 30) {
  log(COLORS.blue, `\n🧹 Cleaning logs older than ${retentionDays} days...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const logFiles = getLogFiles();
  let cleanedCount = 0;
  let freedSpace = 0;
  
  logFiles.forEach(logFile => {
    const filePath = path.join(LOGS_DIR, logFile);
    const stats = fs.statSync(filePath);
    
    // Only clean rotated logs (contain a date)
    if (stats.mtime < cutoffDate && logFile.includes('-')) {
      freedSpace += stats.size;
      fs.unlinkSync(filePath);
      log(COLORS.green, `🗑️  Deleted: ${logFile}`);
      cleanedCount++;
    }
  });
  
  if (cleanedCount === 0) {
    log(COLORS.yellow, '⚠️  No old logs to clean');
  } else {
    log(COLORS.green, `✅ Cleaned ${cleanedCount} old log files, freed ${formatFileSize(freedSpace)}`);
  }
}

function searchLogs(pattern, logFile = null) {
  log(COLORS.blue, `\n🔍 Searching for: "${pattern}"`);
  
  const filesToSearch = logFile ? [logFile] : getLogFiles();
  let totalMatches = 0;
  
  filesToSearch.forEach(file => {
    const filePath = path.join(LOGS_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      log(COLORS.red, `❌ File not found: ${file}`);
      return;
    }
    
    try {
      const output = execSync(`grep -n "${pattern}" "${filePath}" || true`, { encoding: 'utf8' });
      
      if (output.trim()) {
        log(COLORS.cyan, `\n📄 Matches in ${file}:`);
        console.log(output);
        totalMatches += output.split('\n').filter(line => line.trim()).length;
      }
    } catch (error) {
      log(COLORS.red, `❌ Error searching ${file}: ${error.message}`);
    }
  });
  
  log(COLORS.bright, `\n🎯 Total matches: ${totalMatches}`);
}

function showUsage() {
  log(COLORS.bright, '\n📚 Log Management Commands:');
  console.log(`
${COLORS.cyan}Status & Viewing:${COLORS.reset}
  status                    Show log files status
  tail [file] [lines]       Show last N lines (default: combined.log, 50 lines)
  follow [file]             Follow log file in real-time (default: combined.log)
  
${COLORS.cyan}Search:${COLORS.reset}
  search <pattern> [file]   Search for pattern in logs
  
${COLORS.cyan}Maintenance:${COLORS.reset}
  rotate [maxMB]            Rotate logs larger than N MB (default: 10MB)
  clean [days]              Remove logs older than N days (default: 30 days)
  
${COLORS.cyan}Examples:${COLORS.reset}
  npm run logs:status
  npm run logs:tail cron.log 100
  npm run logs:follow 
  npm run logs:search "ERROR"
  npm run logs:rotate 5
  npm run logs:clean 7
  `);
}

// Main command processing
function main() {
  ensureLogsDir();
  
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'status':
      showStatus();
      break;
      
    case 'tail':
      tailLogs(arg1, parseInt(arg2) || 50);
      break;
      
    case 'follow':
      followLogs(arg1);
      break;
      
    case 'rotate':
      rotateLogs(parseInt(arg1) || 10);
      break;
      
    case 'clean':
      cleanOldLogs(parseInt(arg1) || 30);
      break;
      
    case 'search':
      if (!arg1) {
        log(COLORS.red, '❌ Search pattern required');
        return;
      }
      searchLogs(arg1, arg2);
      break;
      
    default:
      showUsage();
  }
}

if (require.main === module) {
  main();
} 