import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { healthLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    cron: {
      status: 'healthy' | 'unhealthy' | 'warning';
      lastRun?: string;
      nextRun?: string;
      error?: string;
    };
    env: {
      status: 'healthy' | 'unhealthy';
      critical_vars_present: boolean;
      missing_vars?: string[];
    };
  };
  version?: string;
  environment: string;
}

export async function GET() {
  const startTime = Date.now();
  
  healthLog.info('Health check requested');
  
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: { status: 'healthy' },
      cron: { status: 'healthy' },
      env: { status: 'healthy', critical_vars_present: true }
    }
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
    healthCheck.status = 'unhealthy';
  }

  // Check environment variables
  const criticalEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = criticalEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    healthCheck.services.env = {
      status: 'unhealthy',
      critical_vars_present: false,
      missing_vars: missingVars
    };
    healthCheck.status = 'unhealthy';
  }

  // Check cron job status (optional, based on file existence)
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const cronStateFile = path.join(process.cwd(), 'cron-state.json');
    
    if (fs.existsSync(cronStateFile)) {
      const cronState = JSON.parse(fs.readFileSync(cronStateFile, 'utf8'));
      const lastRunTime = cronState.timestamp ? new Date(cronState.timestamp) : null;
      
      if (lastRunTime) {
        const timeSinceLastRun = Date.now() - lastRunTime.getTime();
        const maxAllowedGap = 10 * 60 * 1000; // 10 minutes
        
        if (timeSinceLastRun > maxAllowedGap) {
          healthCheck.services.cron = {
            status: 'warning',
            lastRun: lastRunTime.toISOString(),
            error: `Cron hasn't run in ${Math.round(timeSinceLastRun / 60000)} minutes`
          };
          if (healthCheck.status === 'healthy') {
            healthCheck.status = 'degraded';
          }
        } else {
          healthCheck.services.cron = {
            status: 'healthy',
            lastRun: lastRunTime.toISOString()
          };
        }
      }
    } else {
      healthCheck.services.cron = {
        status: 'warning',
        error: 'Cron state file not found'
      };
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }
  } catch (error) {
    healthCheck.services.cron = {
      status: 'unhealthy',
      error: 'Failed to check cron status'
    };
  }

  // Add version if available
  try {
    const packageJson = await import('../../../package.json');
    healthCheck.version = packageJson.version || 'unknown';
  } catch (error) {
    // Version not critical for health check
  }

  const responseTime = Date.now() - startTime;
  
  // Determine HTTP status code
  let statusCode = 200;
  if (healthCheck.status === 'unhealthy') {
    statusCode = 503; // Service Unavailable
  } else if (healthCheck.status === 'degraded') {
    statusCode = 200; // Still operational but with warnings
  }

  return NextResponse.json(
    {
      ...healthCheck,
      response_time_ms: responseTime
    },
    { status: statusCode }
  );
} 