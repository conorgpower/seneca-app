# Seneca

A philosophy-driven mobile app that combines AI-powered Stoic wisdom, daily rituals, breathwork, community reflections, and focus tools into one experience.

## Tech Stack

- **Framework**: React Native 0.81 + Expo SDK 54 + TypeScript
- **Navigation**: React Navigation v7 (bottom tabs, native stack, drawer)
- **Backend**: Supabase (auth, database, real-time subscriptions, storage CDN)
- **AI**: DeepSeek API via OpenAI SDK
- **Payments**: RevenueCat (iOS & Android subscriptions)
- **Analytics**: Mixpanel + AppsFlyer
- **Native Modules**: iOS widgets (WidgetKit), Family Controls (Screen Time API)
- **Animations**: React Native Reanimated + Shopify React Native Skia

## Project Structure

```
src/
  screens/           # 27 core screens + 8 onboarding + 12 settings
  components/        # 17 reusable UI components
  services/          # 26 business logic services
  contexts/          # Auth, Today, FocusLock, AchievementToast
  navigation/        # 7 navigator configurations
  data/              # Static content, achievements, breathwork exercises
  hooks/             # useAchievementCheck, useAppPreferences, useSubscription
  types/             # TypeScript type definitions
ios/
  WisdomWidgetModule/    # Home & lock screen widgets (Swift)
  FocusLockModule/       # Family Controls integration (Swift)
  SenecaShieldConfig/    # Screen Time configuration extension
  SenecaShieldAction/    # Screen Time action extension
plugins/
  withCustomSplash.js    # Custom splash screen plugin
  withWisdomWidget.js    # iOS widget build config
  withFocusLock.js       # Family Controls entitlements
```

## Getting Started

```bash
npm install
npx expo start
```

For iOS native features (widgets, Focus Lock), build with EAS:

```bash
eas build --platform ios --profile development
```

## App Identifiers

- **iOS / Android**: `com.depaorgroup.seneca`
- **Deep Link Scheme**: `senecaapp://`
- **Version**: 2.0.0

## License

Private - All rights reserved
