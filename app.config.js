import 'dotenv/config';

export default {
  expo: {
    name: 'Seneca Chat',
    slug: 'seneca-app',
    version: '2.0.0',
    icon: './assets/icon.png',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'senecaapp',
    ios: {
      supportsTablet: true,
      buildNumber: '1',
      bundleIdentifier: 'com.depaorgroup.seneca',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: 'Allow Seneca to access your photos to set a profile picture.',
        NSCameraUsageDescription: 'Allow Seneca to use your camera to take a profile picture.',
      },
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
      eas: {
        projectId: '7fb611e5-42a3-47b0-a70b-723e1c855af0',
        build: {
          experimental: {
            ios: {
              appExtensions: [
                {
                  targetName: 'WisdomWidgetModuleExtension',
                  bundleIdentifier: 'com.depaorgroup.seneca.WisdomWidgetModule',
                  entitlements: {
                    'com.apple.security.application-groups': ['group.com.depaorgroup.seneca'],
                  },
                },
                {
                  targetName: 'SenecaShieldConfig',
                  bundleIdentifier: 'com.depaorgroup.seneca.SenecaShieldConfig',
                  entitlements: {
                    'com.apple.security.application-groups': ['group.com.depaorgroup.seneca'],
                    'com.apple.developer.family-controls': true,
                  },
                },
                {
                  targetName: 'SenecaShieldAction',
                  bundleIdentifier: 'com.depaorgroup.seneca.SenecaShieldAction',
                  entitlements: {
                    'com.apple.security.application-groups': ['group.com.depaorgroup.seneca'],
                    'com.apple.developer.family-controls': true,
                  },
                },
              ],
            },
          },
        },
      },
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      supabaseAssetBucket: process.env.SUPABASE_ASSET_BUCKET,
      supabaseOptimizedAssetBucket: process.env.SUPABASE_OPTIMIZED_ASSET_BUCKET,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      revenuecatApiKey: process.env.REVENUECAT_API_KEY,
      revenuecatEntitlementId: process.env.REVENUECAT_ENTITLEMENT_ID,
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
      './plugins/withFocusLock',
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Allow Seneca to use your microphone for voice input.',
          speechRecognitionPermission: 'Allow Seneca to recognise your speech for voice input.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Seneca to access your photos to set a profile picture.',
          cameraPermission: 'Allow Seneca to use your camera to take a profile picture.',
        },
      ],
    ],
  },
};
