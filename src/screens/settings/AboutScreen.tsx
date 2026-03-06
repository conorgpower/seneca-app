import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import {
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  StarIcon,
} from 'react-native-heroicons/solid';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import { getSupabaseImageSource } from '../../data/asset-cdn';

export default function AboutScreen() {
  const appVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.0.0';
  const buildNumber =
    Application.nativeBuildVersion ||
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode?.toString() ||
    '1';
  const iosAppStoreId = Constants.expoConfig?.extra?.iosAppStoreId as string | undefined;
  const androidPackageName = Constants.expoConfig?.android?.package;
  const logoSource = getSupabaseImageSource('images/logos/seneca-logo.webp');

  const handleRateApp = async () => {
    try {
      const canRequestInAppReview = await StoreReview.isAvailableAsync();
      if (canRequestInAppReview) {
        await StoreReview.requestReview();
        return;
      }

      if (Platform.OS === 'ios') {
        if (!iosAppStoreId) {
          Alert.alert('Unavailable', 'Missing iOS App Store ID in app config.');
          return;
        }

        const iosReviewUrl = `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${iosAppStoreId}?action=write-review`;
        const iosFallbackUrl = `https://apps.apple.com/app/id${iosAppStoreId}?action=write-review`;
        const supported = await Linking.canOpenURL(iosReviewUrl);
        await Linking.openURL(supported ? iosReviewUrl : iosFallbackUrl);
        return;
      }

      if (!androidPackageName) {
        Alert.alert('Unavailable', 'Missing Android package name in app config.');
        return;
      }

      const androidReviewUrl = `market://details?id=${androidPackageName}`;
      const androidFallbackUrl = `https://play.google.com/store/apps/details?id=${androidPackageName}`;
      const supported = await Linking.canOpenURL(androidReviewUrl);
      await Linking.openURL(supported ? androidReviewUrl : androidFallbackUrl);
    } catch {
      Alert.alert('Unable to Open Store', 'Please open the App Store or Play Store manually.');
    }
  };

  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo / Icon */}
        <View style={styles.logoSection}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoFallback}>
              <BuildingLibraryIcon size={34} color={theme.colors.tertiary} />
            </View>
          )}
          <Text style={styles.appName}>Seneca Chat</Text>
          <Text style={styles.appTagline}>Daily Philosophy Companion</Text>
        </View>

        <SectionHeader title="App Info" />
        <SettingsRow
          type="value"
          label="Version"
          icon={<DevicePhoneMobileIcon size={20} color={theme.colors.tertiary} />}
          value={`${appVersion} (${buildNumber})`}
          onPress={() => {}}
          isFirst
        />
        <SettingsRow
          type="navigate"
          label="What's New"
          icon={<SparklesIcon size={20} color={theme.colors.tertiary} />}
          subtitle="Coming Soon"
          onPress={() => Alert.alert('Coming Soon', 'Release notes will be available in a future update.')}
        />
        <SettingsRow
          type="navigate"
          label="Rate Seneca Chat"
          icon={<StarIcon size={20} color={theme.colors.tertiary} />}
          onPress={handleRateApp}
          isLast
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with philosophy in mind</Text>
          <Text style={styles.footerCopyright}>
            {'\u00A9'} {new Date().getFullYear()} Seneca Chat
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoFallback: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  footerCopyright: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});
