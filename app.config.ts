import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'pinoy-recipes',
  slug: 'pinoy-recipes',
  scheme: 'pinoyrecipes',
    extra: {
    eas: {
      projectId: '3ce8944e-babf-446d-a0ec-0f001cb26934',
    },
  },
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  plugins: [
    'expo-router',
    'expo-image',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.jyanb.pinoyrecipes',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
});