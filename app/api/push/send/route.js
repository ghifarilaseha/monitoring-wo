/**
 * File: app/api/push/send/route.js
 * Purpose: Mengirim push notification ke semua device milik user tertentu.
 *          Dipanggil dari server-side saat admin melakukan Reject WO.
 *          Menggunakan library web-push dengan VAPID authentication.
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const { user_id, title, body, url } = await request.json();

    if (!user_id || !title) {
      return NextResponse.json(
        { error: 'user_id dan title wajib diisi' },
        { status: 400 }
      );
    }

    // Ambil semua subscription device milik user ini
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      // User belum subscribe — tidak ada yang dikirim, bukan error
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url: url || '/lapor' });
    const results = { sent: 0, failed: 0 };

    await Promise.all(
      subscriptions.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
          results.sent++;
        } catch (pushError) {
          results.failed++;
          // Kalau subscription expired/invalid, hapus dari database
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('id', row.id);
          }
          console.error('Push failed for subscription:', pushError.message);
        }
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error('Send push error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
