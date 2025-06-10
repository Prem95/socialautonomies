import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate UUID using Web Crypto API (Edge Runtime compatible)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Add unique request ID to requests for better error tracking and debugging
 */
export function addRequestId(request: NextRequest): { request: NextRequest; requestId: string } {
  // Check if request already has an ID (from load balancer, etc.)
  let requestId = request.headers.get('x-request-id');
  
  if (!requestId) {
    requestId = generateUUID();
  }
  
  // Clone the request with the new header
  const newHeaders = new Headers(request.headers);
  newHeaders.set('x-request-id', requestId);
  
  const newRequest = new NextRequest(request, {
    headers: newHeaders,
  });
  
  return { request: newRequest, requestId };
}

/**
 * Enhanced error logging with request context
 */
export function logError(
  error: unknown,
  context: string,
  requestId?: string,
  userId?: string,
  additionalContext?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const logData = {
    timestamp,
    level: 'ERROR',
    context,
    requestId: requestId || 'unknown',
    userId: userId || 'anonymous',
    error: errorMessage,
    stack: errorStack,
    ...additionalContext,
  };
  
  // Structured logging for production
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(logData));
  } else {
    // Readable logging for development
    console.error(
      `🚨 [${context}] RequestID: ${requestId || 'unknown'}, UserID: ${userId || 'anonymous'}`,
      '\n  Error:', errorMessage,
      '\n  Additional:', additionalContext,
      errorStack ? '\n  Stack:' : '',
      errorStack
    );
  }
}

/**
 * Enhanced info logging with request context
 */
export function logInfo(
  message: string,
  context: string,
  requestId?: string,
  userId?: string,
  additionalContext?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  
  const logData = {
    timestamp,
    level: 'INFO',
    context,
    requestId: requestId || 'unknown',
    userId: userId || 'anonymous',
    message,
    ...additionalContext,
  };
  
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logData));
  } else {
    console.log(
      `ℹ️ [${context}] RequestID: ${requestId || 'unknown'}, UserID: ${userId || 'anonymous'}`,
      '\n  Message:', message,
      additionalContext ? '\n  Context:' : '',
      additionalContext
    );
  }
} 