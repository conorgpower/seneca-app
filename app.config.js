import 'dotenv/config';

export default {
  expo: {
    name: 'Seneca Chat',
    slug: 'seneca-app',
    version: '1.0.0',
    icon: './assets/icon.png',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'senecaapp',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.depaorgroup.seneca',
      buildNumber: '1',
      icon: './assets/icon.png',
    },
    android: {
      package: 'com.depaorgroup.seneca',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseAssetBucket: process.env.SUPABASE_ASSET_BUCKET,
      supabaseOptimizedAssetBucket: process.env.SUPABASE_OPTIMIZED_ASSET_BUCKET,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      revenuecatApiKey: process.env.REVENUECAT_API_KEY,
      appsflyerDevKey: process.env.APPSFLYER_DEV_KEY,
      appsflyerIosAppId: process.env.APPSFLYER_IOS_APP_ID,
      mixpanelToken: process.env.MIXPANEL_TOKEN,
      iosAppStoreId: process.env.IOS_APP_STORE_ID,
    },
    plugins: [
      'expo-audio',
      'expo-apple-authentication',
      './plugins/withCustomSplash',
      './plugins/withWisdomWidget',
    ],
  },
};
