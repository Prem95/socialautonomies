import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Extract the authenticated user ID from request headers or session
 */
export async function getUserId(request: Request): Promise<string | null> {
  // First try to get from headers (set by middleware)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return userId;
  }
  
  // If not in headers, get user from Supabase using the secure getUser() method
  const supabase = await createServerSupabaseClient();
  
  // Use getUser() to get verified user data directly (it handles session checking internally)
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

/**
 * Verify if the request is authenticated and return the user ID
 * Throws an error if not authenticated
 */
export async function requireAuth(request: Request): Promise<string> {
  const userId = await getUserId(request);
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  return userId;
} 