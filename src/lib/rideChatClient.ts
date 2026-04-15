import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type RideChatSenderType = 'client' | 'driver' | 'guest';

let guestRideChatClient: ReturnType<typeof createClient<Database>> | null = null;

function createGuestClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return supabase;
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getRideChatClient(senderType: RideChatSenderType) {
  if (senderType !== 'guest') {
    return supabase;
  }

  if (!guestRideChatClient) {
    guestRideChatClient = createGuestClient();
  }

  return guestRideChatClient;
}