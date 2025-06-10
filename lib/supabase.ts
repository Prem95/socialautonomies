import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create client-side Supabase client
export const createClient = () => {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
};

// Create a server-side Supabase client
export const createServerSupabaseClient = async () => {
  try {
    const cookieStore = cookies();
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return a client without cookie handling as fallback
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      { cookies: {
        get: () => undefined,
        set: () => undefined,
        remove: () => undefined,
      } }
    );
  }
};

// Helper to get the session from server components (deprecated - use getServerUser instead)
export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  try {
    // First verify user with secure method, then get session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }
    
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

// Helper to get the user from server components
export async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Use getUser() directly for secure user verification
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error verifying user:', error);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
} 