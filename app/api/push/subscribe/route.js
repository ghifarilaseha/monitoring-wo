/**
 * File: app/api/push/subscribe/route.js
 * Purpose: Menerima push subscription object dari browser
 *          dan menyimpannya ke tabel push_subscriptions.
 *          Dipanggil saat user pertama kali allow notifikasi.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Gunakan service role key agar bisa bypass RLS dari server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { subscription, user_id } = await request.json();

    if (!subscription || !user_id) {
      return NextResponse.json(
        { error: 'subscription dan user_id wajib diisi' },
        { status: 400 }
      );
    }

    // Simpan subscription — kalau endpoint sudah ada, update saja
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        { user_id, subscription },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
