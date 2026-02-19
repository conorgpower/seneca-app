import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

const APPSFLYER_DEV_KEY = Constants.expoConfig?.extra?.appsflyerDevKey || '';
const APPSFLYER_IOS_APP_ID = Constants.expoConfig?.extra?.appsflyerIosAppId || '';

let isConfigured = false;
let appsFlyerModule: any = null;
let hasTriedLoadingModule = false;
let installConversionCanceller: (() => void) | null = null;
let deepLinkCanceller: (() => void) | null = null;

function getAppsFlyerModule(): any | null {
  if (hasTriedLoadingModule) return appsFlyerModule;
  hasTriedLoadingModule = true;

  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    appsFlyerModule = null;
    return appsFlyerModule;
  }

  // If native module is not linked in this build, skip loading JS wrapper entirely.
  if (!NativeModules.RNAppsFlyer) {
    appsFlyerModule = null;
    return appsFlyerModule;
  }

  try {
    // Lazy-require so Expo Go / non-native runtime does not crash at import time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-appsflyer');
    appsFlyerModule = mod?.default ?? mod;
  } catch (_error) {
    appsFlyerModule = null;
  }

  return appsFlyerModule;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('AppsFlyer operation failed');
}

type AppsFlyerEventValues = Record<string, string | number>;

function registerAppsFlyerListeners(appsFlyer: any): void {
  if (!installConversionCanceller) {
    installConversionCanceller = appsFlyer.onInstallConversionData((payload: unknown) => {
      if (__DEV__) {
        console.log('AppsFlyer install conversion payload:', payload);
      }
    });
  }

  if (!deepLinkCanceller) {
    deepLinkCanceller = appsFlyer.onDeepLink((payload: unknown) => {
      if (__DEV__) {
        console.log('AppsFlyer deep link payload:', payload);
      }
    });
  }
}

/**
 * Initialize AppsFlyer SDK - call once at app startup
 */
export async function initializeAppsFlyer(): Promise<void> {
  if (isConfigured) return;

  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer) {
    console.warn(
      'AppsFlyer native module is unavailable. Use a native build (not Expo Go) and install pods.'
    );
    return;
  }

  if (!APPSFLYER_DEV_KEY) {
    console.warn('AppsFlyer is not configured: missing APPSFLYER_DEV_KEY');
    return;
  }

  if (Platform.OS === 'ios' && !APPSFLYER_IOS_APP_ID) {
    console.warn('AppsFlyer iOS is not fully configured: missing APPSFLYER_IOS_APP_ID');
    return;
  }

  registerAppsFlyerListeners(appsFlyer);

  const options = {
    devKey: APPSFLYER_DEV_KEY,
    isDebug: __DEV__,
    appId: APPSFLYER_IOS_APP_ID,
    onInstallConversionDataListener: true,
    onDeepLinkListener: true,
    timeToWaitForATTUserAuthorization: 10,
  };

  await new Promise<void>((resolve, reject) => {
    appsFlyer.initSdk(
      options,
      () => resolve(),
      (error: unknown) => reject(normalizeError(error))
    );
  });

  isConfigured = true;
}

/**
 * Set current user id for AppsFlyer attribution
 */
export async function setAppsFlyerCustomerUserId(userId: string): Promise<void> {
  if (!userId || !isConfigured) return;

  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer) return;

  await new Promise<void>((resolve, reject) => {
    appsFlyer.setCustomerUserId(
      userId,
      () => resolve(),
      (error: unknown) => reject(normalizeError(error))
    );
  });
}

async function logAppsFlyerEvent(
  eventName: string,
  eventValues: AppsFlyerEventValues
): Promise<void> {
  const appsFlyer = getAppsFlyerModule();
  if (!appsFlyer || !isConfigured) return;

  await new Promise<void>((resolve, reject) => {
    appsFlyer.logEvent(
      eventName,
      eventValues,
      () => resolve(),
      (error: unknown) => reject(normalizeError(error))
    );
  });
}

export async function trackStartTrialEvent(params: {
  price: number;
  currency: string;
  subscriptionId: string;
}): Promise<void> {
  await logAppsFlyerEvent('af_start_trial', {
    af_price: params.price,
    af_currency: params.currency,
    af_subscription_id: params.subscriptionId,
  });
}

export async function trackSubscribeEvent(params: {
  revenue: number;
  currency: string;
  subscriptionId: string;
}): Promise<void> {
  await logAppsFlyerEvent('af_subscribe', {
    af_revenue: params.revenue,
    af_currency: params.currency,
    af_subscription_id: params.subscriptionId,
  });
}
