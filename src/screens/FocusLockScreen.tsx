import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getSupabaseImageSource } from '../data/asset-cdn';
import { AppBackground } from '../components/AppBackground';
import { useFocusLock } from '../contexts/FocusLockContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { drawerEvent } from '../utils/drawerEvent';
import NativeAppGrid from '../components/NativeAppGrid';

export default function FocusLockScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);
  const {
    isSupported,
    isAuthorized,
    isLocked,
    appCount,
    appNames,
    unlockedToday,
    loading,
    requestAuthorization,
    openAppPicker: openAppPickerRaw,
    lockApps,
  } = useFocusLock();

  const openAppPicker = useCallback(async () => {
    await openAppPickerRaw();
    setGridRefreshKey((k) => k + 1);
  }, [openAppPickerRaw]);

  const userName = React.useMemo(() => {
    return user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  }, [user?.user_metadata?.name, user?.email]);

  useFocusEffect(
    useCallback(() => {
      return drawerEvent.listen(() => setShowProfileDrawer(true));
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isSupported) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerContainer}>
          <ProfileAvatar name={userName} avatarUrl={user?.user_metadata?.avatar_url} onPress={() => setShowProfileDrawer(true)} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Focus Lock</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.unsupportedTitle}>Not Available</Text>
          <Text style={styles.unsupportedText}>
            Focus Lock requires iOS 16 or later with Screen Time support.
          </Text>
        </View>
        <ProfileDrawer visible={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
      </SafeAreaView>
    );
  }

  const handleAuthorize = async () => {
    const success = await requestAuthorization();
    if (!success) {
      Alert.alert(
        'Permission Required',
        'Focus Lock needs Screen Time access to manage app restrictions. You can enable this in Settings > Screen Time.',
      );
    }
  };

  const handleSelectApps = async () => {
    if (!isAuthorized) {
      await handleAuthorize();
      return;
    }
    await openAppPicker();
  };

  const handleLock = async () => {
    await lockApps();
  };

  const handleUnlock = () => {
    navigation.navigate('FocusLockUnlock' as never);
  };

  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ProfileAvatar name={userName} avatarUrl={user?.user_metadata?.avatar_url} onPress={() => setShowProfileDrawer(true)} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Focus Lock</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Status Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            {(() => {
              const lockGif = getSupabaseImageSource('gifs/lock_nobg.gif');
              return lockGif ? (
                <Image source={lockGif} style={styles.lockGif} resizeMode="contain" />
              ) : null;
            })()}
          </View>
          <Text style={styles.heroTitle}>
            {isLocked
              ? `${appCount} App${appCount !== 1 ? 's' : ''} Locked`
              : appCount > 0
                ? `${appCount} App${appCount !== 1 ? 's' : ''} Selected`
                : 'No Apps Selected'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isLocked
              ? 'Read your daily wisdom to unlock'
              : 'Choose apps to lock until you read your daily wisdom'}
          </Text>
          {unlockedToday && !isLocked && (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>Unlocked Today</Text>
            </View>
          )}
        </View>

        {/* Locked Apps */}
        {appCount > 0 && (
          <View style={styles.appGridCard}>
            <View style={styles.appGridHeader}>
              <Text style={styles.appGridLabel}>
                {isLocked ? 'Locked Apps' : 'Selected Apps'}
              </Text>
              <Text style={styles.appGridCount}>{appCount}</Text>
            </View>
            <NativeAppGrid
              isLocked={isLocked}
              refreshTrigger={gridRefreshKey}
              style={{
                height: Math.ceil(Math.min(appCount > 11 ? 12 : appCount, 12) / 4) * 72,
              }}
            />
          </View>
        )}

        {/* Authorization prompt — only show after loading confirms not authorized */}
        {!loading && !isAuthorized && (
          <TouchableOpacity style={styles.authCard} onPress={handleAuthorize} activeOpacity={0.7}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            <View style={styles.authCardText}>
              <Text style={styles.authCardTitle}>Enable Screen Time Access</Text>
              <Text style={styles.authCardSubtitle}>
                Required to lock and unlock apps on your device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Select Apps Button */}
        <TouchableOpacity
          style={styles.selectAppsButton}
          onPress={handleSelectApps}
          activeOpacity={0.7}
        >
          <View style={styles.selectAppsLeft}>
            <Ionicons name="apps" size={24} color={theme.colors.primary} />
            <Text style={styles.selectAppsText}>
              {appCount > 0 ? 'Change App Selection' : 'Select Apps to Lock'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Lock / Unlock Button */}
        {appCount > 0 && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isLocked ? styles.actionButtonUnlock : styles.actionButtonLock,
            ]}
            onPress={isLocked ? handleUnlock : handleLock}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.actionButtonText,
                isLocked ? styles.actionButtonTextUnlock : styles.actionButtonTextLock,
              ]}
            >
              {isLocked ? 'Unlock Apps' : 'Lock Apps'}
            </Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'ios' && (
          <Text style={styles.footnote}>
            When locked, a "Time for Wisdom" screen appears when you try to open selected apps.
            Dismiss that screen, then open Seneca Chat and read your daily wisdom to unlock.
          </Text>
        )}
      </ScrollView>

      <ProfileDrawer visible={showProfileDrawer} onClose={() => setShowProfileDrawer(false)} />
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  unsupportedTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  unsupportedText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: theme.colors.quaternary,
  },
  heroIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    marginRight: 25,
  },
  lockGif: {
    width: 160,
    height: 200,
  },
  heroTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  unlockedBadge: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  unlockedBadgeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.success,
  },
  appGridCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  appGridLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  appGridCount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  authCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    gap: theme.spacing.md,
  },
  authCardText: {
    flex: 1,
  },
  authCardTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  authCardSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectAppsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectAppsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  selectAppsText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '500',
    color: theme.colors.text,
  },
  actionButton: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  actionButtonLock: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonUnlock: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
  },
  actionButtonTextLock: {
    color: theme.colors.background,
  },
  actionButtonTextUnlock: {
    color: theme.colors.primary,
  },
  footnote: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
