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
