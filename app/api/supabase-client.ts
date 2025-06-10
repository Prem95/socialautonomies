import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Helper function to extract the JWT from a request header
 */
export function extractJwtFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}

/**
 * Verify JWT token and return user data
 */
export async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      throw error;
    }
    
    return { 
      valid: true, 
      user: data.user 
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { 
      valid: false, 
      user: null 
    };
  }
} 