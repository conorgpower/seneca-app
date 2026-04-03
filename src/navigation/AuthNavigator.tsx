import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingQuestionsScreen from '../screens/OnboardingQuestionsScreen';
import VisionContrastScreen from '../screens/onboarding/VisionContrastScreen';
import ValidationScreen from '../screens/onboarding/ValidationScreen';
import MomentumVisualizationScreen from '../screens/onboarding/MomentumVisualizationScreen';
import TrustSafetyScreen from '../screens/onboarding/TrustSafetyScreen';
import SocialProofScreen from '../screens/onboarding/SocialProofScreen';
import SetupLoadingScreen from '../screens/onboarding/SetupLoadingScreen';
import PlanReadyScreen from '../screens/onboarding/PlanReadyScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import LoginScreen from '../screens/LoginScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import * as RevenueCatService from '../services/revenuecat.service';
import { trackOnboardingScreenView } from '../services/mixpanel.service';
import { signInWithApple, signInWithGoogle } from '../services/auth.service';
import * as UserProfileService from '../services/user-profile.service';
import { startGentleImageWarmup } from '../services/image-cache.service';
import NotificationPermissionScreen from '../screens/onboarding/NotificationPermissionScreen';
import {
  scheduleOnboardingComebackReminder,
  cancelOnboardingComebackReminder,
} from '../services/notifications.service';

const Stack = createNativeStackNavigator();

type FlowStep =
  | 'welcome'
  | 'questions-1'
  | 'vision-contrast'
  | 'questions-2'
  | 'validation'
  | 'notification-permission'
  | 'questions-3'
  | 'momentum'
  | 'questions-4'
  | 'trust-safety'
  | 'social-proof'
  | 'setup-loading'
  | 'plan-ready'
  | 'create-account'
  | 'paywall'
  | 'login';

export default function AuthNavigator() {
  const { signUp, signOut, isAuthenticated, user, refreshSubscription } = useAuth();
  const [currentFlow, setCurrentFlow] = useState<FlowStep>('welcome');
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, any>>({});
  const [questionPhase, setQuestionPhase] = useState<1 | 2 | 3 | 4>(1);
  const [currentQuestionInPhase, setCurrentQuestionInPhase] = useState(0);
  const lastTrackedScreenKey = React.useRef<string | null>(null);
  const onboardingWarmupRef = React.useRef<{ stop: () => void } | null>(null);
  const navDirection = React.useRef<'slide_from_right' | 'slide_from_left'>('slide_from_right');

  // Total steps: Phase1(4) + Vision(1) + Phase2(5) + Validation(1) + NotifPermission(1) + Phase3(4) + Momentum(1) + TrustSafety(1) + Phase4(2) + SocialProof(1) + SetupLoading(1) + PlanReady(1) + CreateAccount(1) = 24
  const TOTAL_STEPS = 24;
  const PHASE_QUESTIONS = [4, 5, 4, 2]; // Questions per phase

  const getCurrentStep = (): number => {
    let step = 0;
    
    if (currentFlow === 'questions-1') {
      return currentQuestionInPhase + 1;
    } else if (currentFlow === 'vision-contrast') {
      return 5;
    } else if (currentFlow === 'questions-2') {
      return 5 + currentQuestionInPhase + 1;
    } else if (currentFlow === 'validation') {
      return 11;
    } else if (currentFlow === 'notification-permission') {
      return 12;
    } else if (currentFlow === 'questions-3') {
      return 12 + currentQuestionInPhase + 1;
    } else if (currentFlow === 'momentum') {
      return 17;
    } else if (currentFlow === 'trust-safety') {
      return 18;
    } else if (currentFlow === 'questions-4') {
      return 18 + currentQuestionInPhase + 1;
    } else if (currentFlow === 'social-proof') {
      return 21;
    } else if (currentFlow === 'setup-loading') {
      return 22;
    } else if (currentFlow === 'plan-ready') {
      return 23;
    } else if (currentFlow === 'create-account') {
      return 24;
    }
    
    return step;
  };

  const getOverallProgress = (): number => {
    const currentStep = getCurrentStep();
    return (currentStep / TOTAL_STEPS) * 100;
  };

  const getOnboardingTrackingPayload = () => {
    if (currentFlow === 'questions-1' ||
      currentFlow === 'questions-2' ||
      currentFlow === 'questions-3' ||
      currentFlow === 'questions-4'
    ) {
      return {
        screenName: `questions_phase_${questionPhase}_q_${currentQuestionInPhase + 1}`,
        flowStep: currentFlow,
        overallStep: getCurrentStep(),
        totalSteps: TOTAL_STEPS,
        questionPhase,
        questionIndex: currentQuestionInPhase + 1,
      };
    }

    if (currentFlow === 'welcome') {
      return {
        screenName: 'welcome',
        flowStep: currentFlow,
      };
    }

    if (currentFlow === 'paywall') {
      return {
        screenName: 'paywall',
        flowStep: currentFlow,
        overallStep: TOTAL_STEPS + 1,
        totalSteps: TOTAL_STEPS + 1,
      };
    }

    if (currentFlow === 'login') {
      return {
        screenName: 'login',
        flowStep: currentFlow,
      };
    }

    return {
      screenName: currentFlow,
      flowStep: currentFlow,
      overallStep: getCurrentStep(),
      totalSteps: TOTAL_STEPS,
    };
  };

  const hasCompletedOnboarding = (profile: UserProfileService.UserProfile | null): boolean => {
    if (!profile) return false;
    if (profile.onboarding_completed_at) return true;
    return !!profile.onboarding_answers && Object.keys(profile.onboarding_answers).length > 0;
  };

  // Route authenticated users based on profile completeness.
  React.useEffect(() => {
    if (!isAuthenticated || currentFlow !== 'welcome' || !user) return;

    let cancelled = false;
    const routePostAuthUser = async () => {
      try {
        const { profile } = await UserProfileService.getUserProfile(user.id);
        if (cancelled) return;

        if (hasCompletedOnboarding(profile)) {
          setCurrentFlow('paywall');
          return;
        }

        setCurrentFlow('questions-1');
        setQuestionPhase(1);
        setCurrentQuestionInPhase(0);
      } catch (error) {
        console.error('Failed to check onboarding completion status:', error);
        if (!cancelled) {
          setCurrentFlow('questions-1');
          setQuestionPhase(1);
          setCurrentQuestionInPhase(0);
        }
      }
    };

    routePostAuthUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentFlow, user]);

  React.useEffect(() => {
    const payload = getOnboardingTrackingPayload();
    const eventKey = `${payload.screenName}:${payload.flowStep}`;
    if (lastTrackedScreenKey.current === eventKey) return;

    lastTrackedScreenKey.current = eventKey;
    trackOnboardingScreenView(payload).catch((error) => {
      console.error('Failed to track onboarding screen view:', error);
    });
  }, [currentFlow, questionPhase, currentQuestionInPhase]);

  React.useEffect(() => {
    const shouldWarmOnboardingAssets = currentFlow !== 'login' && currentFlow !== 'paywall';

    if (shouldWarmOnboardingAssets && !onboardingWarmupRef.current) {
      onboardingWarmupRef.current = startGentleImageWarmup(undefined, { delayMs: 260 });
    }

    if (!shouldWarmOnboardingAssets && onboardingWarmupRef.current) {
      onboardingWarmupRef.current.stop();
      onboardingWarmupRef.current = null;
    }
  }, [currentFlow]);

  React.useEffect(() => {
    return () => {
      if (onboardingWarmupRef.current) {
        onboardingWarmupRef.current.stop();
        onboardingWarmupRef.current = null;
      }
    };
  }, []);

  const handleGetStarted = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('questions-1');
    setQuestionPhase(1);
    setCurrentQuestionInPhase(0);
  };

  const handleQuestionsComplete = (answers: Record<string, any>) => {
    navDirection.current = 'slide_from_right';
    setOnboardingAnswers({ ...onboardingAnswers, ...answers });

    // Determine next step based on current phase
    if (questionPhase === 1) {
      setCurrentFlow('vision-contrast');
    } else if (questionPhase === 2) {
      setCurrentFlow('validation');
    } else if (questionPhase === 3) {
      setCurrentFlow('momentum');
    } else if (questionPhase === 4) {
      setCurrentFlow('social-proof');
    }
  };

  const handleVisionContrastComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('questions-2');
    setQuestionPhase(2);
    setCurrentQuestionInPhase(0);
  };

  const handleValidationComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('notification-permission');
  };

  const handleNotificationPermissionComplete = (permissionGranted: boolean) => {
    if (permissionGranted) {
      scheduleOnboardingComebackReminder().catch((error) => {
        console.error('Failed to schedule onboarding comeback reminder:', error);
      });
    }

    navDirection.current = 'slide_from_right';
    setCurrentFlow('questions-3');
    setQuestionPhase(3);
    setCurrentQuestionInPhase(0);
  };

  const handleMomentumComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('trust-safety');
  };

  const handleTrustSafetyComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('questions-4');
    setQuestionPhase(4);
    setCurrentQuestionInPhase(0);
  };

  const handleSocialProofComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('setup-loading');
  };

  const handleSetupLoadingComplete = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('plan-ready');
  };

  const handlePlanReadyContinue = () => {
    navDirection.current = 'slide_from_right';
    if (isAuthenticated) {
      setCurrentFlow('paywall');
      return;
    }

    setCurrentFlow('create-account');
  };

  const handleCreateAccount = async (email: string, password: string, name: string) => {
    try {
      const { error, session: newSession } = await signUp(email, password, {
        name,
        onboardingAnswers
      });

      if (error) {
        throw new Error(error.message);
      }

      // Identify user with RevenueCat after account creation
      if (newSession?.user) {
        try {
          await RevenueCatService.identifyUser(newSession.user.id);
        } catch (rcError) {
          console.error('Failed to identify user with RevenueCat:', rcError);
        }
      }

      cancelOnboardingComebackReminder().catch((err) => {
        console.error('Failed to cancel onboarding comeback reminder:', err);
      });

      // User is now logged in, proceed to paywall
      setCurrentFlow('paywall');
    } catch (error: any) {
      throw error;
    }
  };

  const handleSocialAuth = async (provider: 'apple' | 'google') => {
    try {
      const { error, user } = provider === 'apple'
        ? await signInWithApple()
        : await signInWithGoogle();

      if (error) {
        throw new Error(error.message);
      }

      if (!user) {
        throw new Error(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in did not return a user.`);
      }

      // Persist onboarding answers for social sign-ins as soon as auth succeeds.
      if (Object.keys(onboardingAnswers).length > 0) {
        await UserProfileService.saveOnboardingAnswers(user.id, onboardingAnswers, user.email);
      }

      const { profile } = await UserProfileService.getUserProfile(user.id);
      const completedOnboarding = hasCompletedOnboarding(profile);

      try {
        await RevenueCatService.identifyUser(user.id);
      } catch (rcError) {
        console.error('Failed to identify social auth user with RevenueCat:', rcError);
      }

      cancelOnboardingComebackReminder().catch((err) => {
        console.error('Failed to cancel onboarding comeback reminder:', err);
      });

      if (completedOnboarding) {
        setCurrentFlow('paywall');
      } else {
        setCurrentFlow('questions-1');
        setQuestionPhase(1);
        setCurrentQuestionInPhase(0);
      }
    } catch (error: any) {
      const message = error?.message || 'Social sign-in failed. Please try again.';
      if (message.toLowerCase().includes('cancel')) {
        return;
      }
      Alert.alert('Sign-in failed', message);
    }
  };

  const handleSubscribe = async () => {
    try {
      const hasPro = await refreshSubscription();
      if (!hasPro) {
        Alert.alert(
          'Subscription Pending',
          'We could not confirm an active subscription yet. Please try Restore or wait a moment.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify subscription status.');
    }
  };

  const handleNavigateToLogin = () => {
    navDirection.current = 'slide_from_right';
    setCurrentFlow('login');
  };

  const handleBackFromLogin = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('welcome');
  };

  const handleBackFromQuestions = async () => {
    navDirection.current = 'slide_from_left';
    if (questionPhase === 1) {
      if (isAuthenticated) {
        await signOut();
      }
      setCurrentFlow('welcome');
    } else if (questionPhase === 2) {
      setCurrentFlow('vision-contrast');
    } else if (questionPhase === 3) {
      setCurrentFlow('notification-permission');
    } else {
      setCurrentFlow('trust-safety');
    }
  };

  const handleBackFromCreateAccount = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('plan-ready');
  };

  const handleBackFromVisionContrast = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('questions-1');
    setQuestionPhase(1);
    setCurrentQuestionInPhase(3); // Last question of phase 1 (0-indexed, so 3 = 4th question)
  };

  const handleBackFromValidation = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('questions-2');
    setQuestionPhase(2);
    setCurrentQuestionInPhase(4); // Last question of phase 2
  };

  const handleBackFromNotificationPermission = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('validation');
  };

  const handleBackFromMomentum = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('questions-3');
    setQuestionPhase(3);
    setCurrentQuestionInPhase(3); // Last question of phase 3
  };

  const handleBackFromTrustSafety = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('momentum');
  };

  const handleBackFromSocialProof = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('questions-4');
    setQuestionPhase(4);
    setCurrentQuestionInPhase(1); // Last question of phase 4 (0-indexed, so 1 = 2nd question)
  };

  const handleBackFromSetupLoading = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('social-proof');
  };

  const handleBackFromPlanReady = () => {
    navDirection.current = 'slide_from_left';
    setCurrentFlow('setup-loading');
  };

  React.useEffect(() => {
    if (isAuthenticated && currentFlow === 'create-account') {
      setCurrentFlow('paywall');
    }
  }, [isAuthenticated, currentFlow]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'none',
      }}
    >
      {currentFlow === 'welcome' && (
        <Stack.Screen name="Welcome">
          {() => (
            <WelcomeScreen
              onGetStarted={handleGetStarted}
              onSocialAuth={handleSocialAuth}
              onContinueWithEmail={handleNavigateToLogin}
            />
          )}
        </Stack.Screen>
      )}

      {(currentFlow === 'questions-1' ||
        currentFlow === 'questions-2' ||
        currentFlow === 'questions-3' ||
        currentFlow === 'questions-4') && (
        <Stack.Screen name="Questions">
          {() => (
            <OnboardingQuestionsScreen
              onComplete={handleQuestionsComplete}
              onBack={handleBackFromQuestions}
              phase={questionPhase}
              overallProgress={getOverallProgress()}
              onQuestionChange={(questionIndex: number) => setCurrentQuestionInPhase(questionIndex)}
              initialQuestionIndex={currentQuestionInPhase}
            />
          )}
        </Stack.Screen>
      )}

      {currentFlow === 'vision-contrast' && (
        <Stack.Screen name="VisionContrast">
          {() => <VisionContrastScreen onComplete={handleVisionContrastComplete} overallProgress={getOverallProgress()} onBack={handleBackFromVisionContrast} />}
        </Stack.Screen>
      )}

      {currentFlow === 'validation' && (
        <Stack.Screen name="Validation">
          {() => (
            <ValidationScreen
              onComplete={handleValidationComplete}
              desiredState={onboardingAnswers['desired-state']}
              overallProgress={getOverallProgress()}
              onBack={handleBackFromValidation}
            />
          )}
        </Stack.Screen>
      )}

      {currentFlow === 'notification-permission' && (
        <Stack.Screen name="NotificationPermission">
          {() => (
            <NotificationPermissionScreen
              onComplete={handleNotificationPermissionComplete}
              overallProgress={getOverallProgress()}
              onBack={handleBackFromNotificationPermission}
            />
          )}
        </Stack.Screen>
      )}

      {currentFlow === 'momentum' && (
        <Stack.Screen name="Momentum">
          {() => <MomentumVisualizationScreen onComplete={handleMomentumComplete} overallProgress={getOverallProgress()} onBack={handleBackFromMomentum} />}
        </Stack.Screen>
      )}

      {currentFlow === 'trust-safety' && (
        <Stack.Screen name="TrustSafety">
          {() => <TrustSafetyScreen onComplete={handleTrustSafetyComplete} overallProgress={getOverallProgress()} onBack={handleBackFromTrustSafety} />}
        </Stack.Screen>
      )}

      {currentFlow === 'social-proof' && (
        <Stack.Screen name="SocialProof">
          {() => <SocialProofScreen onComplete={handleSocialProofComplete} overallProgress={getOverallProgress()} onBack={handleBackFromSocialProof} />}
        </Stack.Screen>
      )}

      {currentFlow === 'setup-loading' && (
        <Stack.Screen name="SetupLoading">
          {() => <SetupLoadingScreen onComplete={handleSetupLoadingComplete} overallProgress={getOverallProgress()} onBack={handleBackFromSetupLoading} />}
        </Stack.Screen>
      )}

      {currentFlow === 'plan-ready' && (
        <Stack.Screen name="PlanReady">
          {() => (
            <PlanReadyScreen onContinue={handlePlanReadyContinue} userAnswers={onboardingAnswers} overallProgress={getOverallProgress()} onBack={handleBackFromPlanReady} />
          )}
        </Stack.Screen>
      )}

      {currentFlow === 'create-account' && !isAuthenticated && (
        <Stack.Screen name="CreateAccount">
          {() => (
            <CreateAccountScreen
              onCreateAccount={handleCreateAccount}
              onSocialAuth={handleSocialAuth}
              onBack={handleBackFromCreateAccount}
              title="Save your progress"
              subtitle="Your personalized plan is ready. Create an account to continue."
              overallProgress={getOverallProgress()}
            />
          )}
        </Stack.Screen>
      )}

      {(currentFlow === 'paywall' || (currentFlow === 'create-account' && isAuthenticated)) && (
        <Stack.Screen name="Paywall">
          {() => <PaywallScreen onSubscribe={handleSubscribe} />}
        </Stack.Screen>
      )}

      {currentFlow === 'login' && (
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              onNavigateToSignup={handleBackFromLogin}
              onSocialAuth={handleSocialAuth}
              showBackButton={true}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
