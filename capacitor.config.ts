import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuration Capacitor — SoloCab
 *
 * Important pour Android :
 * - `androidScheme: 'https'` requis par WebView moderne (sinon localStorage / cookies bloqués)
 * - `cleartext: true` autorise les appels HTTP non-TLS éventuels (Mapbox tiles, debug),
 *   ce qui évite les crashes silencieux de la WebView Android.
 * - Aucun `smallIcon` custom ici : éviter de référencer une ressource drawable inexistante,
 *   sinon le plugin LocalNotifications crashe au boot avec NullPointerException.
 *   Capacitor utilise alors l'icône par défaut de l'app.
 * - Aucun `sound` custom au niveau plugin : un fichier manquant dans res/raw provoque
 *   un crash MediaPlayer au démarrage. Le son est défini dynamiquement via createChannel
 *   (avec catch) dans useNativePushRegistration.
 */
const config: CapacitorConfig = {
  appId: 'com.solocab.app',
  appName: 'SoloCab',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      iconColor: '#FF6B00',
    },
    Geolocation: {
      permissions: ['location', 'coarseLocation'],
    },
  },
};

export default config;
