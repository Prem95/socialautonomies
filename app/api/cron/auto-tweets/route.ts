import { NextRequest, NextResponse } from 'next/server';
import { schedulerService } from '../../scheduler-service';

/**
 * API Route for processing auto-tweets
 * Called by Vercel Cron Jobs every 30 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is coming from Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization');
    // Skip auth check in development for testing
    if (process.env.CRON_SECRET && process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Processing auto-tweets...');
    await schedulerService.processAutoTweets();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auto-tweets processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Error processing auto-tweets:', error);
    return NextResponse.json({ 
      error: 'Failed to process auto-tweets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
} 