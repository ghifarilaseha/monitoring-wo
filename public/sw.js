/**
 * File: sw.js
 * Purpose: Service Worker untuk menerima Web Push Notification.
 *          Jalan di background browser, bahkan saat tab tidak aktif.
 *          Harus ada di public/ agar dapat diakses di /sw.js (root URL).
 */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notifikasi', body: event.data.text() };
  }

  const title = data.title || 'Utility Monitoring System';
  const options = {
    body: data.body || '',
    icon: '/otto-logo.png',
    badge: '/otto-logo.png',
    tag: data.tag || 'wo-notification',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau tab sudah terbuka, fokus ke sana
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      // Kalau tidak ada tab terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
