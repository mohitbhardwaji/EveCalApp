import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch,
      },
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
