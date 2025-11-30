import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App prête à fonctionner hors ligne');
  },
});

// Gérer les clics sur les notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
      // Ouvrir l'URL de la notification
      const url = event.data.url || '/';
      window.location.href = url;
    }
  });
}
