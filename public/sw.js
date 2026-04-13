// Service Worker SoloCab — Push Notifications avec son signature
const SW_VERSION = '3.1.0';

// Sound file for ride notifications (same as in-app)
const RIDE_SOUND_URL = '/sounds/ride-request.mp3';

self.addEventListener('install', (event) => {
  console.log('Service Worker v' + SW_VERSION + ': Installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker v' + SW_VERSION + ': Activé');
  event.waitUntil(clients.claim());
});

// SoloCab signature vibration pattern: Swoosh + pause + Ding
const SOLOCAB_VIBRATION = [100, 50, 200, 80, 150];

// Determine notification priority/style based on tag/type
function getNotificationStyle(data) {
  const tag = data.tag || '';
  const title = data.title || '';

  // Urgent notifications (courses, payments)
  if (tag.includes('course') || title.includes('🚗') || title.includes('📍') || title.includes('🚕')) {
    return { urgency: 'high', renotify: true, requireInteraction: true };
  }

  // Financial (devis, factures, payments)
  if (tag.includes('devis') || tag.includes('facture') || tag.includes('payment') || 
      title.includes('💶') || title.includes('📄') || title.includes('💰')) {
    return { urgency: 'high', renotify: true, requireInteraction: true };
  }

  // Partnerships
  if (tag.includes('partnership') || title.includes('🤝')) {
    return { urgency: 'normal', renotify: true, requireInteraction: false };
  }

  // Admin
  if (tag.includes('admin')) {
    return { urgency: 'normal', renotify: true, requireInteraction: false };
  }

  // Warning/Error
  if (tag.includes('warning') || tag.includes('error') || title.includes('⚠️') || title.includes('🚨')) {
    return { urgency: 'high', renotify: true, requireInteraction: true };
  }

  // Default
  return { urgency: 'normal', renotify: true, requireInteraction: false };
}

// Handle push notifications
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

  const style = getNotificationStyle(data);

  const options = {
    body: data.message || data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'solocab-notification',
    renotify: style.renotify,
    data: {
      url: data.link || data.url || '/',
      timestamp: Date.now()
    },
    requireInteraction: style.requireInteraction,
    vibrate: SOLOCAB_VIBRATION,
    actions: getNotificationActions(data),
    silent: false
  };

  console.log('Service Worker: Affichage notification:', data.title);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Contextual actions based on notification type
function getNotificationActions(data) {
  const tag = data.tag || '';
  const title = data.title || '';

  if (tag.includes('course') || title.includes('🚗')) {
    return [
      { action: 'view', title: '👁️ Voir', icon: '/pwa-192x192.png' },
      { action: 'dismiss', title: '✖️ Fermer', icon: '/pwa-192x192.png' }
    ];
  }

  if (tag.includes('devis') || title.includes('💶')) {
    return [
      { action: 'view', title: '📋 Voir le devis', icon: '/pwa-192x192.png' },
      { action: 'dismiss', title: '✖️ Fermer', icon: '/pwa-192x192.png' }
    ];
  }

  if (tag.includes('facture') || title.includes('📄')) {
    return [
      { action: 'view', title: '📄 Voir la facture', icon: '/pwa-192x192.png' },
      { action: 'dismiss', title: '✖️ Fermer', icon: '/pwa-192x192.png' }
    ];
  }

  return [
    { action: 'view', title: '👁️ Voir', icon: '/pwa-192x192.png' },
    { action: 'dismiss', title: '✖️ Fermer', icon: '/pwa-192x192.png' }
  ];
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Click sur notification', event.action);

  event.notification.close();

  // If dismiss action, just close
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  console.log('Service Worker: Navigation vers', fullUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        return clients.openWindow(fullUrl);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur navigation:', error);
        return clients.openWindow(fullUrl);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification fermée');
});

// Handle messages from client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message reçu', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push subscription change (auto-renewal)
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
