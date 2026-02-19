import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { TodayProvider } from './src/contexts/TodayContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeRevenueCat } from './src/services/revenuecat.service';
import { initializeAppsFlyer } from './src/services/appsflyer.service';
import { initializeMixpanel } from './src/services/mixpanel.service';
import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

export default function App() {
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      console.error('Failed to configure audio mode:', error);
    });

    setIsAudioActiveAsync(true).catch((error) => {
      console.error('Failed to activate audio session:', error);
    });

    initializeRevenueCat().catch((error) => {
      console.error('Failed to initialize RevenueCat:', error);
    });
    initializeAppsFlyer().catch((error) => {
      console.error('Failed to initialize AppsFlyer:', error);
    });
    initializeMixpanel().catch((error) => {
      console.error('Failed to initialize Mixpanel:', error);
    });

  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TodayProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </TodayProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
