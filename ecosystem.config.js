module.exports = {
  apps: [
    {
      name: 'socialautonomies',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      max_memory_restart: '4G',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Health check
      health_check_url: 'https://733f7c3c36e5-12744746306564303069.ngrok-free.app/api/health',
      health_check_grace_period: 3000,
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      
      // Restart policy
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,
      
      // Zero-downtime deployment
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      
      // Environment file watching (reload on .env changes)
      watch: ['.env', '.env.production'],
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', '.next'],
      
      // Graceful shutdown
      shutdown_with_message: true,
    },
    {
      name: 'socialautonomies-cron',
      script: 'node',
      args: 'local-cron-simulator.js',
      cwd: __dirname,
      instances: 1, // Only one cron instance needed
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      
      // Cron-specific logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      log_file: './logs/cron-combined.log',
      
      // Restart policy for cron
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      
      // Environment file watching
      watch: ['.env', '.env.production'],
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', '.next', 'cron-state.json'],
      
      // Graceful shutdown for cron
      shutdown_with_message: true,
      kill_timeout: 10000, // Give cron jobs time to complete
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'node',
      host: ['5.161.200.89'],
      ref: 'origin/main',
      repo: 'git@github.com:socialautonomies/socialautonomies.git',
      path: '/var/www/socialautonomies',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'npm install pm2 -g'
    }
  }
}; 