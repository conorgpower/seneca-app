import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface PlanReadyScreenProps {
  onContinue: () => void;
  userAnswers: Record<string, any>;
  overallProgress?: number;
  onBack?: () => void;
}

export default function PlanReadyScreen({ onContinue, userAnswers, overallProgress, onBack }: PlanReadyScreenProps) {
  // Generate plan details from answers
  const reflectionTime = userAnswers.cadence === 'daily' ? 'Daily' : 'Few times a week';
  const guidanceStyle = userAnswers['challenge-thinking'] === 'direct' ? 'Direct & challenging' : 'Gentle & supportive';
  const pace = userAnswers.pace || 'recommended';
  const philosophy = userAnswers.philosophy || 'stoicism';

  const getPaceDescription = () => {
    switch (pace) {
      case 'gentle':
        return 'Slow, sustainable progress';
      case 'intense':
        return 'Fast-paced transformation';
      default:
        return 'Balanced growth';
    }
  };

  const getPhilosophyName = () => {
    switch (philosophy) {
      case 'stoicism':
        return 'Stoic wisdom';
      case 'buddhism':
        return 'Buddhist mindfulness';
      case 'religion':
        return 'Faith-integrated';
      default:
        return 'Eclectic philosophy';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          {/* Back Button */}
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* Progress Bar */}
          {overallProgress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
              </View>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎯</Text>
          </View>

          <Text style={styles.title}>Your Seneca plan is ready</Text>
          <Text style={styles.subtitle}>We've personalized everything based on your answers</Text>

          <View style={styles.planContainer}>
            <PlanItem
              icon="📅"
              label="Reflection schedule"
              value={reflectionTime}
            />
            <PlanItem
              icon="💬"
              label="Guidance style"
              value={guidanceStyle}
            />
            <PlanItem
              icon="⚡"
              label="Change pace"
              value={getPaceDescription()}
            />
            <PlanItem
              icon="🏛️"
              label="Philosophy focus"
              value={getPhilosophyName()}
            />
          </View>

          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example prompt you'll see:</Text>
            <View style={styles.exampleBubble}>
              <Text style={styles.exampleText}>
                "What's one thing causing you stress right now that you actually can't control? Let's
                practice letting it go."
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>You can adjust these settings anytime</Text>
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PlanItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.planItem}>
      <Text style={styles.planIcon}>{icon}</Text>
      <View style={styles.planTextContainer}>
        <Text style={styles.planLabel}>{label}</Text>
        <Text style={styles.planValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
    marginBottom: theme.spacing.sm,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl * 2,
    lineHeight: 24,
  },
  planContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl * 2,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 12,
  },
  planIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  planTextContainer: {
    flex: 1,
  },
  planLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  planValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  exampleContainer: {
    marginBottom: theme.spacing.xl * 2,
  },
  exampleLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  exampleBubble: {
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  exampleText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
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
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
