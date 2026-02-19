import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface TrustSafetyScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

export default function TrustSafetyScreen({ onComplete, overallProgress, onBack }: TrustSafetyScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {overallProgress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
              </View>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔒</Text>
          </View>

          <Text style={styles.title}>Thank you for trusting Seneca</Text>

          <Text style={styles.subtitle}>Now let's personalize your experience</Text>

          <View style={styles.privacyContainer}>
            <PrivacyItem icon="🛡️" text="Your reflections are private" />
            <PrivacyItem icon="🔐" text="Securely stored and protected" />
            <PrivacyItem icon="🚫" text="Never shared with others" />
          </View>

          <Text style={styles.footer}>
            We take your privacy seriously. Your personal growth journey is yours alone.
          </Text>
        </ScrollView>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PrivacyItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.privacyItem}>
      <Text style={styles.privacyIcon}>{icon}</Text>
      <Text style={styles.privacyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
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
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  privacyContainer: {
    width: '100%',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl * 2,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 12,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  privacyText: {
    flex: 1,
    fontSize: 16,
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
