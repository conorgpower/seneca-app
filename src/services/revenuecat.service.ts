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

const API_KEY = Constants.expoConfig?.extra?.revenuecatApiKey || '';
const ENTITLEMENT_ID = 'Seneca Chat Pro';
const PRO_PRODUCT_MARKERS = ['.seneca.pro.', '.pro.yearly', '.pro.monthly', '.pro.weekly'];

let isConfigured = false;

/**
 * Initialize RevenueCat SDK - call once at app startup
 */
export async function initializeRevenueCat(): Promise<void> {
  if (isConfigured) return;
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
  if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined') {
    return true;
  }

  return customerInfo.activeSubscriptions.some((productId) =>
    PRO_PRODUCT_MARKERS.some((marker) => productId.includes(marker))
  );
}

/**
 * Get the subscription tier from active entitlements
 */
export function getSubscriptionTier(customerInfo: CustomerInfo): string | null {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const productId =
    entitlement?.productIdentifier ||
    customerInfo.activeSubscriptions.find((id) =>
      PRO_PRODUCT_MARKERS.some((marker) => id.includes(marker))
    );

  if (!productId) return null;

  if (productId.includes('yearly')) return 'yearly';
  if (productId.includes('monthly')) return 'monthly';
  if (productId.includes('weekly')) return 'weekly';
  return 'unknown';
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
  const hasIntroTrial = Boolean(pkg.product.introPrice);
  const introPriceValue = Number((pkg.product.introPrice as any)?.price ?? 0);
  const productPriceValue = Number(pkg.product.price ?? 0);

  if (hasIntroTrial) {
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
