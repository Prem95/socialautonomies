import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Note: this client is meant to be used only on the server side
// for administrative tasks that require bypassing RLS.
export const createAdminClient = () => {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}; 