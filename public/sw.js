// Service Worker pour gérer les notifications push VAPID
const SW_VERSION = '2.1.0';

self.addEventListener('install', (event) => {
  console.log('Service Worker v' + SW_VERSION + ': Installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker v' + SW_VERSION + ': Activé');
  event.waitUntil(clients.claim());
});

// Gérer les notifications push (vraies notifications VAPID)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push reçu', event);
  
  let data = {
    title: 'SoloCab',
    message: 'Nouvelle notification',
    link: '/',
    tag: 'solocab-notification'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      try {
        data.message = event.data.text();
      } catch (e2) {
        console.error('Service Worker: Erreur parsing push data:', e2);
      }
    }
  }

  const options = {
    body: data.message || data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'solocab-notification',
    renotify: true,
    data: {
      url: data.link || data.url || '/',
      timestamp: Date.now()
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  console.log('Service Worker: Affichage notification:', data.title);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gérer les clics sur les notifications - CORRIGÉ
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Click sur notification');
  
  // Fermer la notification immédiatement
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  console.log('Service Worker: Navigation vers', fullUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Chercher une fenêtre existante de l'app
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            // Naviguer vers l'URL et focus la fenêtre
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        return clients.openWindow(fullUrl);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur navigation:', error);
        // Fallback: essayer d'ouvrir une nouvelle fenêtre
        return clients.openWindow(fullUrl);
      })
  );
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification fermée');
});

// Gérer les messages du client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message reçu', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push subscription change (renouvellement automatique)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Service Worker: Subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true
    }).then((subscription) => {
      console.log('Service Worker: Nouvelle subscription créée');
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: subscription.toJSON()
          });
        });
      });
    }).catch((error) => {
      console.error('Service Worker: Erreur resubscription:', error);
    })
  );
});
