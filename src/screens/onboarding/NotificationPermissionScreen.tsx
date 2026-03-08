import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { requestNotificationPermissions } from '../../services/notifications.service';

interface NotificationPermissionScreenProps {
  onComplete: (permissionGranted: boolean) => void;
  overallProgress?: number;
  onBack?: () => void;
}

export default function NotificationPermissionScreen({ onComplete, overallProgress, onBack }: NotificationPermissionScreenProps) {
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermissions();
    onComplete(granted);
  };

  const handleSkip = () => {
    onComplete(false);
  };

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
          <View style={styles.iconContainer}>
            <FontAwesome6 name="bell" size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Never lose momentum</Text>

          <Text style={styles.subtitle}>A quick daily reminder to keep your momentum going.</Text>

          <View style={styles.benefitsContainer}>
            <BenefitItem icon="fire" text="Daily wisdom, on time" />
            <BenefitItem icon="calendar-check" text="Keep your streak alive" />
            <BenefitItem icon="heart" text="Gentle, never spammy" />
          </View>

          <Text style={styles.footer}>
            You can change this anytime in Settings
          </Text>
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.enableButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); handleEnableNotifications(); }}>
          <Text style={styles.enableButtonText}>Enable Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); handleSkip(); }}>
          <Text style={styles.skipButtonText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </AppBackground>
  );
}

function BenefitItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconContainer}>
        <FontAwesome6 name={icon} size={16} color={theme.colors.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
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
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  enableButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  enableButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 1.5,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl * 1.5,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.md,
    borderRadius: 12,
    gap: theme.spacing.md,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  footer: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: theme.spacing.sm,
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
