import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// Rate limiting store (in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 100, // Increased for dashboard usage
  windowMs: 30 * 1000, // 30 seconds
};

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

/**
 * Rate limiting middleware
 */
export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }
  
  // Get current count for this IP
  const current = rateLimitStore.get(ip);
  
  if (!current) {
    // First request from this IP
    rateLimitStore.set(ip, { count: 1, resetTime: now });
    return null;
  }
  
  if (current.resetTime < windowStart) {
    // Reset the counter
    rateLimitStore.set(ip, { count: 1, resetTime: now });
    return null;
  }
  
  if (current.count >= RATE_LIMIT.maxRequests) {
    // Rate limit exceeded
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${RATE_LIMIT.maxRequests} requests per minute allowed. Please wait before retrying.`,
        retryAfter: Math.ceil((current.resetTime + RATE_LIMIT.windowMs - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((current.resetTime + RATE_LIMIT.windowMs - now) / 1000).toString(),
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil((current.resetTime + RATE_LIMIT.windowMs) / 1000).toString()
        }
      }
    );
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(ip, current);
  
  return null;
}

/**
 * JWT Authentication middleware
 * Supports both Bearer token and cookie-based authentication
 */
export async function authenticateJWT(request: NextRequest): Promise<{ userId: string; email?: string } | NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Method 1: Check for Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          return { userId: user.id, email: user.email };
        }
      }
    }
    
    // Method 2: Check for x-user-id header (set by middleware.ts)
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const userEmail = request.headers.get('x-user-email');
      return { 
        userId, 
        email: userEmail || undefined 
      };
    }
    
    // Method 3: Check for Supabase session cookies using secure getUser()
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        return { 
          userId: user.id, 
          email: user.email || undefined 
        };
      }
    } catch (sessionError) {
      // If getUser() fails, continue to the authentication required response
      console.debug('Session validation failed:', sessionError);
    }
    
    // No valid authentication found
    return NextResponse.json(
      { 
        error: 'Authentication required',
        message: 'Valid authentication required'
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('JWT authentication error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        message: 'Failed to validate authentication'
      },
      { status: 401 }
    );
  }
}

/**
 * Generic input validation with Zod
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Request data is invalid',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          },
          { status: 400 }
        )
      };
    }
    
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Validation error',
          message: 'Failed to validate input data'
        },
        { status: 400 }
      )
    };
  }
}

/**
 * Complete security middleware wrapper
 * Combines rate limiting, JWT auth, and input validation
 */
export function withSecurity<T>(
  schema?: z.ZodSchema<T>,
  skipAuth = false
) {
  return function(
    handler: (
      request: NextRequest,
      context: { params?: any },
      user?: { userId: string; email?: string },
      validatedData?: T
    ) => Promise<NextResponse>
  ) {
    return async function(
      request: NextRequest,
      context: { params?: any } = {}
    ): Promise<NextResponse> {
      try {
        // 1. Rate limiting
        const rateLimitResponse = rateLimit(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
        
        // 2. JWT Authentication (unless skipped)
        let user: { userId: string; email?: string } | undefined;
        if (!skipAuth) {
          const authResult = await authenticateJWT(request);
          if (authResult instanceof NextResponse) {
            return authResult;
          }
          user = authResult;
        }
        
        // 3. Input validation (if schema provided)
        let validatedData: T | undefined;
        if (schema && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
          try {
            const body = await request.json();
            const validation = validateInput(schema, body);
            if (!validation.success) {
              return validation.error;
            }
            validatedData = validation.data;
          } catch (error) {
            return NextResponse.json(
              {
                error: 'Invalid JSON',
                message: 'Request body must be valid JSON'
              },
              { status: 400 }
            );
          }
        }
        
        // 4. Call the actual handler
        return await handler(request, context, user, validatedData);
        
      } catch (error) {
        console.error('Security middleware error:', error);
        return NextResponse.json(
          {
            error: 'Internal server error',
            message: 'An unexpected error occurred'
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Error handler utility
 */
export function handleError(error: unknown, context = 'API'): NextResponse {
  console.error(`[${context}] Error:`, error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.errors
      },
      { status: 400 }
    );
  }
  
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      );
    }
    
    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Resource not found'
        },
        { status: 404 }
      );
    }
  }
  
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    },
    { status: 500 }
  );
} 