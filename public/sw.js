// Service Worker pour gérer les notifications push
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activé');
  event.waitUntil(clients.claim());
});

// Gérer les notifications push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push reçu');
  
  if (!event.data) {
    console.log('Service Worker: Pas de données dans le push');
    return;
  }

  try {
    const data = event.data.json();
    const title = data.title || 'SoloCab';
    const options = {
      body: data.message || data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'solocab-notification',
      data: {
        url: data.link || data.url || '/'
      },
      requireInteraction: false,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Service Worker: Erreur traitement push:', error);
  }
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Click sur notification');
  
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification fermée');
});