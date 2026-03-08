import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { getSupabaseImageSource } from '../../data/asset-cdn';

interface TrustSafetyScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

const GIF_OUTER = 220;
const GIF_INNER = 176;

export default function TrustSafetyScreen({ onComplete, overallProgress, onBack }: TrustSafetyScreenProps) {
  const gifSource = getSupabaseImageSource('gifs/reaction-yeah-once.gif');

  return (
    <AppBackground topSafeZone={0}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {overallProgress !== undefined && (
            <OnboardingProgressBar progress={overallProgress} />
          )}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gifWrapper}>
            <LinearGradient
              colors={['rgba(242, 223, 192, 0.45)', 'rgba(222, 173, 92, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientRing}
            />
            <View style={styles.gifInnerCircle}>
              {gifSource ? (
                <Image source={gifSource} style={styles.gifImage} />
              ) : (
                <FontAwesome6 name="hand" size={64} color={theme.colors.primary} />
              )}
            </View>
          </View>

          <Text style={styles.title}>Thank you for trusting us</Text>

          <Text style={styles.subtitle}>Now let's personalize Seneca for you...</Text>

          <View style={styles.privacyCardWrapper}>
            <View style={styles.privacyIconContainer}>
              <FontAwesome6 name="lock" size={14} color={theme.colors.primary} />
            </View>
            <View style={styles.privacyCard}>
              <Text style={styles.privacyHeading}>Your privacy and security matter to us.</Text>
            <Text style={styles.privacyBody}>
              We promise to always keep your personal information private and secure.
            </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onComplete(); }}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  gifWrapper: {
    width: GIF_OUTER,
    height: GIF_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  gradientRing: {
    position: 'absolute',
    width: GIF_OUTER,
    height: GIF_OUTER,
    borderRadius: GIF_OUTER / 2,
  },
  gifInnerCircle: {
    width: GIF_INNER,
    height: GIF_INNER,
    borderRadius: GIF_INNER / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifImage: {
    width: GIF_INNER,
    height: GIF_INNER,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  privacyCardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  privacyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -18,
    zIndex: 1,
  },
  privacyCard: {
    width: '100%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 16,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  privacyHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  privacyBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
