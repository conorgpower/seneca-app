import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import {
  trackStartTrialEvent,
  trackSubscribeEvent,
} from './appsflyer.service';
import {
  trackMixpanelStartTrialEvent,
  trackMixpanelSubscribeEvent,
} from './mixpanel.service';
import { scheduleTrialEndingReminder } from './notifications.service';

const API_KEY = Constants.expoConfig?.extra?.revenuecatApiKey || '';
// RevenueCat "entitlement identifier" (not display name). Configure via env if it differs per project.
// Fallbacks are handled in hasProEntitlement() for resilience across dashboard changes.
const ENTITLEMENT_ID = Constants.expoConfig?.extra?.revenuecatEntitlementId || 'pro';

let isConfigured = false;

function getActiveEntitlements(customerInfo: CustomerInfo): Record<string, any> {
  return (customerInfo.entitlements?.active as any) || {};
}

function resolvePrimaryActiveEntitlement(customerInfo: CustomerInfo): any | null {
  const active = getActiveEntitlements(customerInfo);
  if (!active || typeof active !== 'object') return null;

  const direct = (active as any)[ENTITLEMENT_ID];
  if (direct) return direct;

  const keys = Object.keys(active);
  if (keys.length === 1) return (active as any)[keys[0]];

  const proLikeKey = keys.find((k) => /pro|premium|plus/i.test(k));
  if (proLikeKey) return (active as any)[proLikeKey];

  return null;
}

/**
 * Initialize RevenueCat SDK - call once at app startup
 */
export async function initializeRevenueCat(): Promise<void> {
  if (isConfigured) return;
  if (!API_KEY) {
    throw new Error('Missing RevenueCat API key (extra.revenuecatApiKey).');
  }
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: API_KEY });
  isConfigured = true;
}

/**
 * Identify a user with RevenueCat (call after authentication)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  // Skip if already identified as this user to avoid redundant logIn warning
  const currentUserId = await Purchases.getAppUserID();
  if (currentUserId === userId) {
    return await Purchases.getCustomerInfo();
  }
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * Log out the current user from RevenueCat
 */
export async function logOutUser(): Promise<void> {
  await Purchases.logOut();
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return await Purchases.getCustomerInfo();
}

/**
 * Check if the user has the "Seneca Chat Pro" entitlement
 */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  const active = getActiveEntitlements(customerInfo);
  if ((active as any)[ENTITLEMENT_ID]) return true;

  // If there is exactly one active entitlement, treat it as "pro" for this app.
  const activeKeys = Object.keys(active || {});
  if (activeKeys.length === 1) return true;

  // Fallback: subscription may be active even if entitlements are misconfigured/renamed.
  const activeSubs = (customerInfo as any).activeSubscriptions as string[] | undefined;
  if (Array.isArray(activeSubs) && activeSubs.length > 0) return true;

  // Fallback: some apps key entitlements differently (e.g. "premium", "plus").
  if (activeKeys.some((k) => /pro|premium|plus/i.test(k))) return true;

  return false;
}

/**
 * Get the subscription tier from active entitlements
 */
export function getSubscriptionTier(customerInfo: CustomerInfo): string | null {
  const entitlement = resolvePrimaryActiveEntitlement(customerInfo);
  const productId =
    entitlement?.productIdentifier ||
    ((customerInfo as any).activeSubscriptions?.[0] as string | undefined);

  if (!productId) return null;

  if (productId.includes('yearly')) return 'yearly';
  if (productId.includes('monthly')) return 'monthly';
  if (productId.includes('weekly')) return 'weekly';
  return null;
}

/**
 * Get available offerings (products)
 */
export async function getOfferings(): Promise<PurchasesOfferings> {
  return await Purchases.getOfferings();
}

/**
 * Purchase a specific package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; productIdentifier: string }> {
  const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);

  const currency = pkg.product.currencyCode || 'USD';
  const subscriptionId = productIdentifier || pkg.product.identifier;
  const introPriceValue = Number((pkg.product.introPrice as any)?.price ?? 0);
  const productPriceValue = Number(pkg.product.price ?? 0);
  const activeEntitlements = customerInfo.entitlements?.active || {};
  const directEntitlement = (activeEntitlements as any)[ENTITLEMENT_ID];
  const matchingEntitlement =
    directEntitlement ||
    Object.values(activeEntitlements as any).find(
      (entitlement: any) => entitlement?.productIdentifier === subscriptionId
    ) ||
    // If the entitlement id changed (or display name was used), pick the sole active entitlement.
    (Object.keys(activeEntitlements as any).length === 1
      ? (activeEntitlements as any)[Object.keys(activeEntitlements as any)[0]]
      : null);
  const periodType = (matchingEntitlement as any)?.periodType;
  const isTrialPeriod = periodType === 'trial';

  if (isTrialPeriod) {
    const isYearlyPlan = subscriptionId.includes('yearly');
    if (isYearlyPlan) {
      const expirationDateRaw = (matchingEntitlement as any)?.expirationDate;
      const trialEndsAt = expirationDateRaw
        ? new Date(expirationDateRaw)
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      scheduleTrialEndingReminder(trialEndsAt, 24).catch((error) => {
        console.error('Failed to schedule trial-ending reminder notification:', error);
      });
    }

    trackStartTrialEvent({
      price: Number.isFinite(introPriceValue) ? introPriceValue : 0,
      currency,
      subscriptionId,
    }).catch((error) => {
      console.error('Failed to track AppsFlyer af_start_trial event:', error);
    });
    trackMixpanelStartTrialEvent({
      price: Number.isFinite(introPriceValue) ? introPriceValue : 0,
      currency,
      subscriptionId,
    }).catch((error) => {
      console.error('Failed to track Mixpanel trial start event:', error);
    });
  } else {
    trackSubscribeEvent({
      revenue: Number.isFinite(productPriceValue) ? productPriceValue : 0,
      currency,
      subscriptionId,
    }).catch((error) => {
      console.error('Failed to track AppsFlyer af_subscribe event:', error);
    });
    trackMixpanelSubscribeEvent({
      revenue: Number.isFinite(productPriceValue) ? productPriceValue : 0,
      currency,
      subscriptionId,
    }).catch((error) => {
      console.error('Failed to track Mixpanel subscription event:', error);
    });
  }

  return { customerInfo, productIdentifier };
}

/**
 * Restore purchases for the current user
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases();
}

/**
 * Add a listener for customer info updates
 */
export function addCustomerInfoUpdateListener(
  listener: (customerInfo: CustomerInfo) => void
): void {
  Purchases.addCustomerInfoUpdateListener(listener);
}

/**
 * Remove a listener for customer info updates
 */
export function removeCustomerInfoUpdateListener(
  listener: (customerInfo: CustomerInfo) => void
): void {
  Purchases.removeCustomerInfoUpdateListener(listener);
}

export { ENTITLEMENT_ID };
