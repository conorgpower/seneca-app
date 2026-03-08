import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LockOpenIcon } from 'react-native-heroicons/solid';
import { theme } from '../theme';
import { AppBackground } from '../components/AppBackground';
import { useFocusLock } from '../contexts/FocusLockContext';
import { useToday } from '../contexts/TodayContext';
import { getSupabaseImageSource } from '../data/asset-cdn';

const WISDOM_BG_IMAGE = getSupabaseImageSource('images/background-quote.webp');

export default function FocusLockUnlockScreen() {
  const navigation = useNavigation<any>();
  const { unlockApps, isLocked } = useFocusLock();
  const { dailyQuote } = useToday();
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // If not locked, redirect back
  useEffect(() => {
    if (!isLocked && !unlocked) {
      navigation.goBack();
    }
  }, [isLocked, unlocked, navigation]);

  const handleUnlock = async () => {
    setUnlocking(true);
    await unlockApps();
    setUnlocked(true);
    setUnlocking(false);
  };

  const handleDone = () => {
    navigation.navigate('App', { screen: 'Today' });
  };

  const displayQuote =
    dailyQuote?.quote_text ||
    'Waste no more time arguing about what a good man should be. Be one.';
  const displayAuthor = dailyQuote?.author || 'Marcus Aurelius';

  const quoteContent = (
    <View style={styles.quoteOverlay}>
      <Text style={styles.quoteLabel}>Wisdom of the Day</Text>
      <Text style={styles.quoteText}>"{displayQuote}"</Text>
      <Text style={styles.quoteAuthor}>— {displayAuthor}</Text>
    </View>
  );

  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!unlocked ? (
          <>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/* Centered Content */}
            <View style={styles.centeredContent}>
              {/* Title */}
              <View style={styles.titleSection}>
                <Text style={styles.title}>Your Daily Wisdom</Text>
                <Text style={styles.subtitle}>
                  Read and reflect on today's wisdom to unlock your apps
                </Text>
              </View>

              {/* Quote Card — same style as Today screen */}
              <View style={styles.quoteCard}>
                {WISDOM_BG_IMAGE ? (
                  <View style={styles.quoteBackground}>
                    <Image
                      source={WISDOM_BG_IMAGE}
                      style={styles.quoteImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay} />
                    {quoteContent}
                  </View>
                ) : (
                  <View style={[styles.quoteBackground, styles.quoteBackgroundFallback]}>
                    {quoteContent}
                  </View>
                )}
              </View>

              {/* Unlock Button */}
              <TouchableOpacity
                style={styles.unlockButton}
                onPress={handleUnlock}
                activeOpacity={0.8}
                disabled={unlocking}
              >
                {unlocking ? (
                  <ActivityIndicator size="small" color={theme.colors.background} />
                ) : (
                  <Text style={styles.unlockButtonText}>I've Read Today's Wisdom</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Unlocked State */}
            <View style={styles.unlockedContainer}>
              <View style={styles.unlockedIconContainer}>
                <LockOpenIcon size={56} color={theme.colors.primary} />
              </View>
              <Text style={styles.unlockedTitle}>Apps Unlocked</Text>
              <Text style={styles.unlockedSubtitle}>
                Your apps are now accessible. Enjoy your day with wisdom.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -48,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  quoteCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 40,
  },
  quoteBackground: {
    width: '100%',
    minHeight: 220,
    justifyContent: 'center',
  },
  quoteImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    aspectRatio: 1,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  quoteBackgroundFallback: {
    backgroundColor: '#4A90A4',
  },
  quoteOverlay: {
    padding: theme.spacing.xl,
    paddingVertical: 32,
    justifyContent: 'flex-start',
  },
  quoteLabel: {
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: theme.spacing.lg,
    lineHeight: 28,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteAuthor: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  unlockButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  unlockButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.background,
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  unlockedTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  unlockedSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.background,
  },
});
