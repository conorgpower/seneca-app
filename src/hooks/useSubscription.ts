import { useState, useEffect, useCallback } from 'react';
import { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import * as RevenueCatService from '../services/revenuecat.service';

interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentTier: string | null;
}

interface SubscriptionActions {
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

export function useSubscription(): SubscriptionState & SubscriptionActions {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  const updateFromCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    const hasPro = RevenueCatService.hasProEntitlement(info);
    setIsSubscribed(hasPro);
    setCurrentTier(RevenueCatService.getSubscriptionTier(info));
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const info = await RevenueCatService.getCustomerInfo();
      updateFromCustomerInfo(info);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    }
  }, [updateFromCustomerInfo]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [info, availableOfferings] = await Promise.all([
          RevenueCatService.getCustomerInfo(),
          RevenueCatService.getOfferings(),
        ]);
        updateFromCustomerInfo(info);
        setOfferings(availableOfferings);
      } catch (error) {
        console.error('Failed to initialize subscription state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    const listener = (info: CustomerInfo) => {
      updateFromCustomerInfo(info);
    };
    RevenueCatService.addCustomerInfoUpdateListener(listener);

    return () => {
      RevenueCatService.removeCustomerInfoUpdateListener(listener);
    };
  }, [updateFromCustomerInfo]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: info } = await RevenueCatService.purchasePackage(pkg);
      updateFromCustomerInfo(info);
      return RevenueCatService.hasProEntitlement(info);
    } catch (error: any) {
      if (error.userCancelled) {
        return false;
      }
      throw error;
    }
  }, [updateFromCustomerInfo]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await RevenueCatService.restorePurchases();
      updateFromCustomerInfo(info);
      return RevenueCatService.hasProEntitlement(info);
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }, [updateFromCustomerInfo]);

  return {
    isSubscribed,
    isLoading,
    customerInfo,
    offerings,
    currentTier,
    purchasePackage,
    restorePurchases,
    refreshStatus,
  };
}
