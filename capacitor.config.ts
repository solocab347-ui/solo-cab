import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb7de2decc6d441aa3800f8d244f90e4',
  appName: 'SoloCab',
  webDir: 'dist',
  server: {
    url: 'https://solocab.fr',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
