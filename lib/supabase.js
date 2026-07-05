import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Menggunakan trik alias "+" pada email Gmail asli, supaya selalu lolos
// validasi format email Supabase (domain fiktif seperti .local/.app kadang ditolak).
// Email tidak akan pernah benar-benar terkirim karena "Confirm email" dimatikan.
const BASE_EMAIL_USER = 'lasehaghifari';
const BASE_EMAIL_DOMAIN = 'gmail.com';

export function usernameToEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${BASE_EMAIL_USER}+${clean}@${BASE_EMAIL_DOMAIN}`;
}
