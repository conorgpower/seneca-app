import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { handleDeepLink } from '../services/deep-link.service';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { startSignedInPriorityWarmup } from '../services/image-cache.service';

const signedInLinking = {
  prefixes: ['senecaapp://'],
  config: {
    screens: {
      App: {
        screens: {
          Today: {
            screens: {
              TodayMain: 'today',
              Calendar: 'today/calendar',
            },
          },
          Community: {
            screens: {
              CommunityMain: 'community',
              ShareThought: 'community/share-thought',
              MyReflections: 'community/my-reflections',
            },
          },
        },
      },
    },
  },
};

const signedOutLinking = {
  prefixes: ['senecaapp://'],
  config: {
    screens: {
      Welcome: {
        path: 'auth',
      },
      Login: {
        path: 'auth/login',
      },
      CreateAccount: {
        path: 'auth/create-account',
      },
      Paywall: {
        path: 'auth/paywall',
      },
      Questions: {
        path: 'auth/questions',
      },
      VisionContrast: {
        path: 'auth/vision-contrast',
      },
      Validation: {
        path: 'auth/validation',
      },
      Momentum: {
        path: 'auth/momentum',
      },
      TrustSafety: {
        path: 'auth/trust-safety',
      },
      SocialProof: {
        path: 'auth/social-proof',
      },
      SetupLoading: {
        path: 'auth/setup-loading',
      },
      PlanReady: {
        path: 'auth/plan-ready',
      },
    },
  },
};

export default function RootNavigator() {
  const { isAuthenticated, hasActiveSubscription, loading, refreshSession } = useAuth();
  const signedInWarmupRef = React.useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    // Handle initial URL (app opened via link)
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('Initial URL:', url);
        const result = await handleDeepLink(url);
        if (result.success) {
          console.log('Deep link handled successfully, refreshing session...');
          await refreshSession();
        }
      }
    };

    handleInitialURL();

    // Listen for URL changes (app already open)
    const subscription = Linking.addEventListener('url', async (event) => {
      if (event.url) {
        console.log('URL received:', event.url);
        const result = await handleDeepLink(event.url);
        if (result.success) {
          console.log('Deep link handled successfully, refreshing session...');
          await refreshSession();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshSession]);

  useEffect(() => {
    const shouldWarmSignedInAssets = !loading && isAuthenticated && hasActiveSubscription;

    if (shouldWarmSignedInAssets && !signedInWarmupRef.current) {
      signedInWarmupRef.current = startSignedInPriorityWarmup({ delayMs: 220 });
    }

    if (!shouldWarmSignedInAssets && signedInWarmupRef.current) {
      signedInWarmupRef.current.stop();
      signedInWarmupRef.current = null;
    }
  }, [loading, isAuthenticated, hasActiveSubscription]);

  useEffect(() => {
    return () => {
      if (signedInWarmupRef.current) {
        signedInWarmupRef.current.stop();
        signedInWarmupRef.current = null;
      }
    };
  }, []);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  const isSignedIn = isAuthenticated && hasActiveSubscription;

  return (
    <NavigationContainer linking={isSignedIn ? signedInLinking : signedOutLinking}>
      {isSignedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
});
