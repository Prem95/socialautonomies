import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { addRequestId } from '@/app/api/middleware/request-id';

// Helper function to control logging - only log in development mode
const isDev = process.env.NODE_ENV === 'development';
const debugLog = (message: string, ...args: any[]) => {
  if (isDev && process.env.DEBUG_MIDDLEWARE === 'true') {
    console.log(message, ...args);
  }
};

export async function middleware(request: NextRequest) {
  // Add request ID for better error tracking
  const { request: requestWithId, requestId } = addRequestId(request);
  
  debugLog("Middleware running for:", request.url, "RequestID:", requestId);
  
  let response = NextResponse.next({
    request: {
      headers: requestWithId.headers,
    },
  });

  // Debug cookies
  const cookiesList = requestWithId.cookies.getAll();
  debugLog("Cookies in middleware:", cookiesList.map(c => c.name));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return requestWithId.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          requestWithId.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: requestWithId.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          requestWithId.cookies.delete({
            name,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: requestWithId.headers,
            },
          });
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  const url = new URL(requestWithId.url);
  
  // First check if there's a session, then verify with getUser() for security
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  
  // If there's a session, verify the user with the Supabase Auth server
  let verifiedUser = null;
  if (session) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user) {
      verifiedUser = userData.user;
    }
  }
  
  // Protected routes: redirects to login if no session
  // Exclude webhook endpoints from authentication
  const isWebhookEndpoint = url.pathname === '/api/stripe/webhook';
  
  if (
    !isWebhookEndpoint && (
      url.pathname.startsWith('/dashboard') || 
      url.pathname.startsWith('/api/agents') || 
      url.pathname.startsWith('/api/agents/new') ||
      url.pathname.startsWith('/api/agents/edit') ||
      url.pathname.startsWith('/api/profile') ||
      url.pathname.startsWith('/api/stripe') || 
      url.pathname.startsWith('/checkout') ||
      url.pathname.startsWith('/api/stripe/checkout') ||
      url.pathname.startsWith('/api/stripe/verify-session') ||
      url.pathname.startsWith('/api/stripe/success')
    )
  ) {
    if (!session || !verifiedUser) {
      debugLog("No session or verified user found, checking if API route");
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      // For non-API routes, redirect to homepage
      return NextResponse.redirect(new URL('/', requestWithId.url));
    }
    
    // Add user ID to request headers for API routes
    if (url.pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(requestWithId.headers);
      requestHeaders.set('x-user-id', verifiedUser.id);
      requestHeaders.set('x-request-id', requestId);
      
      // Also pass email if available for Stripe checkout
      if (verifiedUser.email) {
        requestHeaders.set('x-user-email', verifiedUser.email);
      }
      
      // Create a new response with the updated headers
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      // Set response headers for tracking
      response.headers.set('x-request-id', requestId);
    }
    
    return response;
  }

  // Auth routes: redirects to dashboard if session exists
  if (['/login', '/signup', '/reset-password'].includes(url.pathname)) {
    if (session) {
      // Get the redirect URL from query parameters or default to dashboard
      const redirectTo = url.searchParams.get('redirect') || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, requestWithId.url));
    }
    return response;
  }

  // Special case for auth debug - always allow access
  if (url.pathname === '/auth/debug') {
    return response;
  }

  // Handle auth callback specially
  if (url.pathname === '/auth/callback') {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/reset-password',
    '/auth/callback',
    '/auth/debug',
    '/api/:path*',
    '/pricing',
    '/checkout',
    '/api/stripe/checkout',
    '/api/stripe/verify-session',
    '/api/stripe/success'
  ],
};