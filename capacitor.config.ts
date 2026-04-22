import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb7de2decc6d441aa3800f8d244f90e4',
  appName: 'SoloCab',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6B00',
      sound: 'ride_alert.wav',
    },
    Geolocation: {
      permissions: ['location', 'coarseLocation'],
    },
  },
};

export default config;
