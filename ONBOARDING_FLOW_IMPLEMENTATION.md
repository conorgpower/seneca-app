# Onboarding Flow & Subscription Implementation

## Overview
This document describes the implementation of the complete onboarding flow with subscription management.

## Flow Architecture

### User Journey
1. **Onboarding Questions** → User answers questions across 4 phases
2. **Create Account** → User creates account with email/password
3. **Logged In State** → User is authenticated but without subscription
4. **Paywall** → User must subscribe to access the app
5. **Subscription** → After payment, user gets full access
6. **App Restart** → Logged-in users without subscription see paywall again

### Key Principles
- ✅ User stays logged in after account creation
- ✅ Onboarding answers are saved to their profile
- ✅ Subscription status is tracked in database
- ✅ Paywall blocks access until subscription is active
- ✅ Cached subscription status for quick app startup

## Implementation Details

### 1. Database Schema (Migration 003)

**File**: `supabase/migrations/003_user_profiles.sql`

**Tables**:
- `user_profiles` - Stores user data with:
  - Basic info (email, name)
  - Onboarding answers (JSONB)
  - Subscription status (boolean, tier, dates)
  - RevenueCat integration fields

**Features**:
- Auto-creates profile when user signs up (via trigger)
- Row Level Security (RLS) enabled
- Auto-updating timestamps

**To Apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `003_user_profiles.sql`
3. Run the migration

**Note**: Migration `002_chat_history.sql` has also been updated to use `user_id` instead of `device_id` for proper authentication. If you already applied the old version, you'll need to migrate your data or reapply the updated migration.

### 2. User Profile Service

**File**: `src/services/user-profile.service.ts`

**Functions**:
- `saveOnboardingAnswers()` - Saves answers to database
- `getUserProfile()` - Fetches profile with subscription status
- `updateSubscriptionStatus()` - Updates subscription in DB and cache
- `getCachedSubscriptionStatus()` - Quick local check
- `clearCachedSubscriptionStatus()` - Cleanup on logout

**Caching**:
Uses AsyncStorage with key `@seneca_subscription_status` for fast startup checks.

### 3. Auth Context Updates

**File**: `src/contexts/AuthContext.tsx`

**New State**:
- `hasActiveSubscription` - Boolean tracking subscription status

**New Methods**:
- `updateSubscriptionStatus(hasSubscription, tier?)` - Updates subscription
- `saveOnboardingAnswers(answers)` - Saves onboarding data

**Behavior**:
- Loads subscription status on auth state change
- Clears subscription cache on logout
- Supports onboarding answers in signUp metadata

### 4. Navigation Logic

#### RootNavigator
**File**: `src/navigation/RootNavigator.tsx`

```typescript
// Shows main app only if BOTH conditions are true:
isAuthenticated && hasActiveSubscription ? <AppNavigator /> : <AuthNavigator />
```

#### AuthNavigator
**File**: `src/navigation/AuthNavigator.tsx`

**Changes**:
1. Removed sign-out logic after account creation
2. Saves onboarding answers when creating account
3. Calls `updateSubscriptionStatus()` when user subscribes
4. Shows paywall automatically if user is authenticated but unpaid
5. Removed back button from paywall (user must subscribe or logout)

### 5. Paywall Screen
**File**: `src/screens/PaywallScreen.tsx`

- Back button removed (was only for testing)
- Called when user completes account creation
- Called automatically if app restarts with unpaid user

## Usage Flow

### New User Flow
```
Welcome → Questions → Create Account 
  ↓ (logged in, hasSubscription = false)
Paywall → Subscribe → Update DB
  ↓ (hasSubscription = true)
Main App
```

### Returning Unpaid User
```
App Start → Check Auth → isAuthenticated ✓, hasSubscription ✗
  ↓
Show Paywall → Subscribe → Main App
```

### Returning Paid User
```
App Start → Check Auth → isAuthenticated ✓, hasSubscription ✓
  ↓
Main App
```

## Testing

### Test New User Flow
1. Fresh install or logout
2. Complete onboarding questions
3. Create account with email/password
4. Verify: Should see paywall (still logged in)
5. Check database: User profile should have onboarding_answers populated

### Test App Restart (Unpaid)
1. Create account but don't subscribe
2. Force close app
3. Restart app
4. Verify: Should show paywall immediately

### Test App Restart (Paid)
1. Create account and subscribe (or manually update DB)
2. Force close app
3. Restart app
4. Verify: Should show main app

## Database Queries

### Check User Profile
```sql
SELECT * FROM user_profiles WHERE email = 'user@example.com';
```

### Manually Grant Subscription (Testing)
```sql
UPDATE user_profiles 
SET 
  has_active_subscription = true,
  subscription_tier = 'yearly',
  subscription_start_date = now(),
  subscription_end_date = now() + interval '1 year'
WHERE email = 'user@example.com';
```

### View All Unpaid Users
```sql
SELECT email, created_at 
FROM user_profiles 
WHERE has_active_subscription = false;
```

## AsyncStorage Keys

- `@seneca_subscription_status` - Cached subscription status
  ```json
  {
    "hasSubscription": false,
    "updatedAt": "2026-02-08T10:30:00Z"
  }
  ```

## Future Enhancements

### RevenueCat Integration
When integrating RevenueCat for actual payments:

1. Update `handleSubscribe()` in AuthNavigator:
```typescript
const handleSubscribe = async (selectedPlan: string) => {
  try {
    // Call RevenueCat to process payment
    const purchase = await Purchases.purchasePackage(selectedPackage);
    
    // Update database
    await updateSubscriptionStatus(
      true, 
      selectedPlan === 'yearly' ? 'yearly' : 'monthly'
    );
  } catch (error) {
    // Handle error
  }
};
```

2. Add webhook handler for RevenueCat events
3. Sync entitlements from RevenueCat to database

### Analytics
Track key events:
- `onboarding_completed` - User finishes questions
- `account_created` - User signs up
- `paywall_viewed` - User sees paywall
- `subscription_started` - User subscribes
- `subscription_cancelled` - User cancels

## Troubleshooting

### Issue: User logged out after creating account
**Solution**: Removed `signOut()` call in AuthNavigator. User now stays logged in.

### Issue: User goes straight to main app after account creation
**Solution**: RootNavigator now checks both `isAuthenticated` AND `hasActiveSubscription`.

### Issue: Onboarding answers not saved
**Solution**: Check that migration 003 is applied. Verify profile creation trigger exists.

### Issue: App shows welcome screen for logged-in user
**Solution**: Check subscription status loading in AuthContext. Verify cache is working.

## Files Modified

1. `supabase/migrations/003_user_profiles.sql` - NEW
2. `supabase/migrations/002_chat_history.sql` - UPDATED (uses user_id instead of device_id)
3. `src/services/user-profile.service.ts` - NEW
4. `src/services/chat-history.service.ts` - UPDATED (requires userId parameter)
5. `src/contexts/AuthContext.tsx` - UPDATED
6. `src/navigation/RootNavigator.tsx` - UPDATED
7. `src/navigation/AuthNavigator.tsx` - UPDATED
8. `src/screens/ChatScreen.tsx` - UPDATED (passes userId to chat service)
9. `src/screens/PaywallScreen.tsx` - UPDATED (back button support)
10. `src/components/ChatHistoryModal.tsx` - UPDATED (uses userId)

---

**Last Updated**: February 8, 2026
**Status**: ✅ Ready for testing
**Next Steps**: 
1. Apply database migration 003
2. Test onboarding flow end-to-end
3. Integrate RevenueCat for real payments
