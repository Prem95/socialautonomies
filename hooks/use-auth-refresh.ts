"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export function useAuthRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshTime = useRef<number>(0);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  
  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      // Skip refresh if we already refreshed recently (within last 30 seconds)
      const now = Date.now();
      if (now - lastRefreshTime.current < 30000) {
        console.log('Skipping auth refresh - too soon since last refresh');
        return true;
      }
      
      setIsRefreshing(true);
      
      // First verify we have a valid authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('No valid user session to refresh:', userError);
        router.push('/login');
        return false;
      }
      
      // Get session for expiry checking
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found after user verification');
        router.push('/login');
        return false;
      }
      
      // Only refresh if session is actually nearing expiry (within 10 minutes)
      const expiresAt = session?.expires_at || 0;
      const expiresInSeconds = expiresAt - Math.floor(Date.now() / 1000);
      
      if (expiresInSeconds > 600) {
        console.log('Session not near expiry, skipping refresh');
        lastRefreshTime.current = now;
        return true;
      }
      
      // Attempt to refresh the session
      const { error } = await supabase.auth.refreshSession();
      lastRefreshTime.current = now;
      
      if (error) {
        console.error('Error refreshing session:', error);
        router.push('/login');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Unexpected error during auth refresh:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, router]);
  
  // Auto refresh on initial load, but don't trigger a refresh too often
  useEffect(() => {
    // Run refresh session only if it hasn't been run in the last 5 seconds
    if (Date.now() - lastRefreshTime.current > 5000) {
      refreshSession();
    }
  }, [refreshSession]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return { refreshSession, isRefreshing };
} 