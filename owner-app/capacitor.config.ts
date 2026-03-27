import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.fuelfinder.owner',
  appName: 'Fuel Finder Owner',
  webDir: 'dist',
  server: {
    // In production, the app loads from the local dist/ files
    // and hits the remote API directly
    androidScheme: 'https',
  },
};

export default config;
