import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { CustomerInfo } from 'react-native-purchases';
import * as AuthService from '../services/auth.service';
import * as UserProfileService from '../services/user-profile.service';
import * as RevenueCatService from '../services/revenuecat.service';
import * as AppsFlyerService from '../services/appsflyer.service';
import * as MixpanelService from '../services/mixpanel.service';
import { registerPushToken, deactivatePushToken } from '../services/push-token.service';

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
  updateSubscriptionStatus: (
    hasSubscription: boolean,
    tier?: string,
    revenueCat?: {
      customerId?: string | null;
      entitlements?: Record<string, any> | null;
    }
  ) => Promise<void>;
  saveOnboardingAnswers: (answers: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const hasPro = RevenueCatService.hasProEntitlement(info);
      const tier = RevenueCatService.getSubscriptionTier(info) || undefined;
      const { error } = await UserProfileService.updateSubscriptionStatus(
        user.id,
        hasPro,
        tier,
        {
          customerId: info.originalAppUserId || user.id,
          entitlements: info.entitlements?.active || null,
        }
      );

      if (!isCancelled && !error) {
        setHasActiveSubscription(hasPro);
      }
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
          metadata.onboardingAnswers
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

  const updateSubscriptionStatus = async (
    hasSubscription: boolean,
    tier?: string,
    revenueCat?: {
      customerId?: string | null;
      entitlements?: Record<string, any> | null;
    }
  ) => {
    if (!user) return;
    
    const { error } = await UserProfileService.updateSubscriptionStatus(
      user.id,
      hasSubscription,
      tier,
      revenueCat
    );
    
    if (!error) {
      setHasActiveSubscription(hasSubscription);
    }
  };

  const saveOnboardingAnswers = async (answers: Record<string, any>) => {
    if (!user) return;
    
    await UserProfileService.saveOnboardingAnswers(user.id, answers);
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
    updateSubscriptionStatus,
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
