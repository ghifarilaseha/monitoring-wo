import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Domain palsu di belakang layar, supaya pelaksana cukup input "username"
const FAKE_DOMAIN = 'monitoring-wo.local';

export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${FAKE_DOMAIN}`;
}
