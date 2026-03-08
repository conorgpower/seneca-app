import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { CustomerInfo } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthService from '../services/auth.service';
import * as UserProfileService from '../services/user-profile.service';
import * as RevenueCatService from '../services/revenuecat.service';
import * as AppsFlyerService from '../services/appsflyer.service';
import * as MixpanelService from '../services/mixpanel.service';
import {
  registerPushToken,
  deactivatePushToken,
  syncNotificationPrefs,
} from '../services/push-token.service';
import {
  hasNotificationPermission,
  cancelAllReminders,
  scheduleReminders,
  cancelTrialNudgeReminder,
} from '../services/notifications.service';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { name?: string; onboardingAnswers?: Record<string, any> }
  ) => Promise<{ error: AuthError | null; session?: Session | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshSubscription: () => Promise<boolean>;
  saveOnboardingAnswers: (answers: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const NOTIFICATION_PREFS_KEY = '@seneca_notification_prefs';

interface NotificationPrefs {
  pushEnabled: boolean;
  dailyReminder: boolean;
  streakReminder: boolean;
  communityUpdates: boolean;
  reminderHour: number;
  reminderMinute: number;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  pushEnabled: true,
  dailyReminder: true,
  streakReminder: true,
  communityUpdates: false,
  reminderHour: 9,
  reminderMinute: 0,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncSubscriptionFromCustomerInfo = React.useCallback(
    async (authUserId: string, info: CustomerInfo) => {
      const hasPro = RevenueCatService.hasProEntitlement(info);
      const tier = RevenueCatService.getSubscriptionTier(info) || undefined;

      setHasActiveSubscription(hasPro);

      if (hasPro) {
        cancelTrialNudgeReminder().catch((err) => {
          console.error('Failed to cancel trial nudge reminder:', err);
        });
      }

      const { error } = await UserProfileService.updateSubscriptionStatus(authUserId, hasPro, tier, {
        customerId: info.originalAppUserId || authUserId,
        entitlements: info.entitlements?.active || null,
      });

      if (error) {
        console.error('Failed to persist subscription status to user profile:', error);
      }

      return hasPro;
    },
    []
  );

  useEffect(() => {
    const identifyMixpanelUser = (authUser: User) => {
      MixpanelService.identifyMixpanelUser(authUser.id)
        .then(() =>
          MixpanelService.setMixpanelUserProfile({
            $email: authUser.email,
            $name: authUser.user_metadata?.name,
            signup_method: authUser.app_metadata?.provider,
            created_at: authUser.created_at,
          })
        )
        .catch((err) => {
          console.error('Failed to identify/profile user in Mixpanel:', err);
        });
    };

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const currentSession = await AuthService.getSession();
        console.log('Retrieved session:', currentSession ? 'Session found' : 'No session');
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        // Load subscription status, identify with RevenueCat, and register push token
        if (currentSession?.user) {
          await loadSubscriptionStatus(currentSession.user.id);
          RevenueCatService.identifyUser(currentSession.user.id).catch((err) => {
            console.error('Failed to identify user with RevenueCat:', err);
          });
          AppsFlyerService.setAppsFlyerCustomerUserId(currentSession.user.id).catch((err) => {
            console.error('Failed to identify user with AppsFlyer:', err);
          });
          identifyMixpanelUser(currentSession.user);
          registerPushToken(currentSession.user.id).catch(() => {});
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = AuthService.onAuthStateChange(
      async (newSession) => {
        console.log('Auth state changed:', newSession ? 'Signed in' : 'Signed out');
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          await loadSubscriptionStatus(newSession.user.id);
          RevenueCatService.identifyUser(newSession.user.id).catch((err) => {
            console.error('Failed to identify user with RevenueCat:', err);
          });
          AppsFlyerService.setAppsFlyerCustomerUserId(newSession.user.id).catch((err) => {
            console.error('Failed to identify user with AppsFlyer:', err);
          });
          identifyMixpanelUser(newSession.user);
        } else {
          setHasActiveSubscription(false);
          await UserProfileService.clearCachedSubscriptionStatus();
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;
    const listener = async (info: CustomerInfo) => {
      if (isCancelled) return;
      await syncSubscriptionFromCustomerInfo(user.id, info);
    };

    RevenueCatService.addCustomerInfoUpdateListener(listener);
    RevenueCatService.getCustomerInfo().then(listener).catch((error) => {
      console.error('Failed to sync initial RevenueCat customer info:', error);
    });

    return () => {
      isCancelled = true;
      RevenueCatService.removeCustomerInfoUpdateListener(listener);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const appStateRef = { current: AppState.currentState as AppStateStatus };

    const reconcileNotificationPrefsWithOS = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        const parsed = stored
          ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) }
          : { ...DEFAULT_NOTIFICATION_PREFS };
        const granted = await hasNotificationPermission();

        const reconciled: NotificationPrefs = granted
          ? parsed
          : { ...parsed, pushEnabled: false };

        if (!granted) {
          await cancelAllReminders();
        } else if (reconciled.pushEnabled && reconciled.dailyReminder) {
          await scheduleReminders(reconciled.reminderHour, reconciled.reminderMinute, [1, 2, 3, 4, 5, 6, 7]);
        }

        if (!cancelled) {
          await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(reconciled));
          await syncNotificationPrefs(user.id, reconciled);
        }
      } catch (error) {
        console.error('Failed to reconcile notification prefs with OS permissions:', error);
      }
    };

    reconcileNotificationPrefsWithOS().catch((error) => {
      console.error('Failed initial notification permission reconciliation:', error);
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = appStateRef.current === 'inactive' || appStateRef.current === 'background';
      if (wasBackgrounded && nextState === 'active') {
        reconcileNotificationPrefsWithOS().catch((error) => {
          console.error('Failed foreground notification permission reconciliation:', error);
        });
      }
      appStateRef.current = nextState;
    });

    return () => {
      cancelled = true;
      appStateSubscription.remove();
    };
  }, [user?.id]);

  const loadSubscriptionStatus = async (userId: string) => {
    try {
      const { profile } = await UserProfileService.getUserProfile(userId);
      if (profile) {
        setHasActiveSubscription(profile.has_active_subscription);
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  const refreshSubscription = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const info = await RevenueCatService.getCustomerInfo();
      return await syncSubscriptionFromCustomerInfo(user.id, info);
    } catch (error) {
      console.error('Failed to refresh subscription from RevenueCat:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, session: newSession, user: newUser } = await AuthService.signIn(
      email,
      password
    );

    if (!error && newSession) {
      setSession(newSession);
      setUser(newUser || null);
    }

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { name?: string; onboardingAnswers?: Record<string, any> }
  ) => {
    const { error, session: newSession, user: newUser } = await AuthService.signUp(
      email,
      password,
      { name: metadata?.name }
    );

    if (!error && newSession && newUser) {
      setSession(newSession);
      setUser(newUser);
      setHasActiveSubscription(false); // New users don't have subscription
      
      // Save onboarding answers if provided
      if (metadata?.onboardingAnswers) {
        await UserProfileService.saveOnboardingAnswers(
          newUser.id,
          metadata.onboardingAnswers,
          email
        );
      }
    }

    return { error, session: newSession };
  };

  const signOut = async () => {
    if (user) {
      deactivatePushToken(user.id).catch(() => {});
      MixpanelService.resetMixpanelIdentity().catch((err) => {
        console.error('Failed to reset Mixpanel identity:', err);
      });
    }
    RevenueCatService.logOutUser().catch((err) => {
      console.error('Failed to log out from RevenueCat:', err);
    });
    await AuthService.signOut();
    setSession(null);
    setUser(null);
    setHasActiveSubscription(false);
    await UserProfileService.clearCachedSubscriptionStatus();
  };

  const refreshSession = async () => {
    const { session: newSession, user: newUser } = await AuthService.refreshSession();
    if (newSession && newUser) {
      setSession(newSession);
      setUser(newUser);
      await loadSubscriptionStatus(newUser.id);
    }
  };

  const saveOnboardingAnswers = async (answers: Record<string, any>) => {
    if (!user) return;

    await UserProfileService.saveOnboardingAnswers(user.id, answers, user.email ?? undefined);
  };

  const value: AuthContextType = {
    session,
    user,
    isAuthenticated: !!session,
    hasActiveSubscription,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
    refreshSubscription,
    saveOnboardingAnswers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
