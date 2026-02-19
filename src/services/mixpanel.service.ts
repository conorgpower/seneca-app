import Constants from 'expo-constants';
import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || '';

let mixpanel: Mixpanel | null = null;
let isInitialized = false;

type MixpanelPrimitive = string | number | boolean | null;
type MixpanelEventProperties = Record<string, MixpanelPrimitive | undefined>;
type MixpanelProfileProperties = Record<string, MixpanelPrimitive | undefined>;

function compactProperties(
  properties: MixpanelEventProperties
): Record<string, MixpanelPrimitive> {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as Record<string, MixpanelPrimitive>;
}

async function ensureMixpanel(): Promise<Mixpanel | null> {
  if (!MIXPANEL_TOKEN) return null;
  if (mixpanel) return mixpanel;

  mixpanel = new Mixpanel(MIXPANEL_TOKEN, false, true);
  await mixpanel.init();
  isInitialized = true;
  return mixpanel;
}

/**
 * Initialize Mixpanel tracking - call once at app startup
 */
export async function initializeMixpanel(): Promise<void> {
  if (isInitialized) return;

  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel is not configured: missing MIXPANEL_TOKEN');
    isInitialized = true;
    return;
  }

  await ensureMixpanel();
  isInitialized = true;
}

/**
 * Identify current authenticated user
 */
export async function identifyMixpanelUser(userId: string): Promise<void> {
  if (!userId) return;
  const client = await ensureMixpanel();
  if (!client) return;
  await client.identify(userId);
}

export async function setMixpanelUserProfile(
  properties: MixpanelProfileProperties
): Promise<void> {
  const client = await ensureMixpanel();
  if (!client) return;

  const people = client.getPeople();
  people.set(compactProperties(properties));
}

/**
 * Reset Mixpanel identity on logout
 */
export async function resetMixpanelIdentity(): Promise<void> {
  const client = await ensureMixpanel();
  if (!client) return;
  client.reset();
}

export async function trackMixpanelEvent(
  eventName: string,
  properties: MixpanelEventProperties = {}
): Promise<void> {
  const client = await ensureMixpanel();
  if (!client) return;
  client.track(eventName, compactProperties(properties));
}

export async function trackOnboardingScreenView(params: {
  screenName: string;
  flowStep: string;
  overallStep?: number;
  totalSteps?: number;
  questionPhase?: number;
  questionIndex?: number;
}): Promise<void> {
  await trackMixpanelEvent('Onboarding Screen Viewed', {
    screen_name: params.screenName,
    flow_step: params.flowStep,
    overall_step: params.overallStep,
    total_steps: params.totalSteps,
    question_phase: params.questionPhase,
    question_index: params.questionIndex,
  });
}

export async function trackMixpanelStartTrialEvent(params: {
  price: number;
  currency: string;
  subscriptionId: string;
}): Promise<void> {
  await trackMixpanelEvent('Subscription Trial Started', {
    price: params.price,
    currency: params.currency,
    subscription_id: params.subscriptionId,
  });
}

export async function trackMixpanelSubscribeEvent(params: {
  revenue: number;
  currency: string;
  subscriptionId: string;
}): Promise<void> {
  await trackMixpanelEvent('Subscription Purchased', {
    revenue: params.revenue,
    currency: params.currency,
    subscription_id: params.subscriptionId,
  });
}
