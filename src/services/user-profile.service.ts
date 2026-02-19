import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_STATUS_KEY = '@seneca_subscription_status';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  onboarding_answers: Record<string, any> | null;
  onboarding_completed_at: string | null;
  has_active_subscription: boolean;
  subscription_tier: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  revenue_cat_customer_id: string | null;
  revenue_cat_entitlements: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Save onboarding answers to user profile
 */
export async function saveOnboardingAnswers(
  userId: string,
  answers: Record<string, any>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_answers: answers,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error saving onboarding answers:', error);
    return { error };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(
  userId: string
): Promise<{ profile: UserProfile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Cache subscription status locally
    if (data) {
      await AsyncStorage.setItem(
        SUBSCRIPTION_STATUS_KEY,
        JSON.stringify({
          hasSubscription: data.has_active_subscription,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    return { profile: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return { profile: null, error };
  }
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  userId: string,
  hasSubscription: boolean,
  tier?: string,
  revenueCat?: {
    customerId?: string | null;
    entitlements?: Record<string, any> | null;
  }
): Promise<{ error: Error | null }> {
  try {
    const updates: any = {
      has_active_subscription: hasSubscription,
    };

    if (tier) {
      updates.subscription_tier = tier;
      updates.subscription_start_date = new Date().toISOString();
      
      // Calculate end date based on tier
      const endDate = new Date();
      if (tier === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (tier === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      updates.subscription_end_date = endDate.toISOString();
    }

    if (revenueCat) {
      if (typeof revenueCat.customerId !== 'undefined') {
        updates.revenue_cat_customer_id = revenueCat.customerId;
      }
      if (typeof revenueCat.entitlements !== 'undefined') {
        updates.revenue_cat_entitlements = revenueCat.entitlements;
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    // Update local cache
    await AsyncStorage.setItem(
      SUBSCRIPTION_STATUS_KEY,
      JSON.stringify({
        hasSubscription,
        updatedAt: new Date().toISOString(),
      })
    );

    return { error: null };
  } catch (error: any) {
    console.error('Error updating subscription status:', error);
    return { error };
  }
}

/**
 * Get cached subscription status (for quick checks during app startup)
 */
export async function getCachedSubscriptionStatus(): Promise<{
  hasSubscription: boolean;
  updatedAt: string | null;
} | null> {
  try {
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error getting cached subscription status:', error);
    return null;
  }
}

/**
 * Clear cached subscription status
 */
export async function clearCachedSubscriptionStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
  } catch (error) {
    console.error('Error clearing cached subscription status:', error);
  }
}
