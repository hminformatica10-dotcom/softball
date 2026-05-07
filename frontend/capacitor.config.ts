import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeratyx.softball',
  appName: 'Zeratyx',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "333160410955-o1hniu53nondfvfrh28udqaa2n661540.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  },
  server: {
    cleartext: true
  }
};

export default config;
