import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import * as TodayService from '../services/today.service';
import type { MainStackParamList } from '../navigation/MainNavigator';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../hooks/useAppPreferences';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Insight'>;
type InsightRouteProp = RouteProp<MainStackParamList, 'Insight'>;

export default function InsightScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InsightRouteProp>();
  const { user } = useAuth();
  const {
    refreshProgress,
    currentStreak,
    todayProgress,
    optimisticallyCompleteToday,
    optimisticallyCompleteStage,
  } = useToday();
  const { passageId, reflection } = route.params;

  const [submitting, setSubmitting] = useState(false);

  const progress = todayProgress?.progressPercentage || 0;


  const handleShare = async () => {
    if (!reflection) return;
    try {
      await Share.share({
        message: `Personal Insight:\n\n${reflection}`,
        title: 'Philosophical Insight',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleChat = () => {
    navigation.navigate('Chat' as any, {
      initialContext: reflection,
      initialMessage: `Help me apply this insight: "${reflection}"`,
    });
  };

  const handleFinish = () => {
    if (!user) return;

    triggerHaptic('success');
    const alreadyComplete =
      (todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.passageCompleted ?? false) &&
      (todayProgress?.insightCompleted ?? false);
    const willCompleteToday =
      !alreadyComplete &&
      !(todayProgress?.insightCompleted ?? false) &&
      (todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.passageCompleted ?? false);

    if (willCompleteToday) {
      const newStreak = (currentStreak?.current_streak || 0) + 1;
      optimisticallyCompleteToday();
      navigation.navigate('Streak', { newStreak });
    } else {
      optimisticallyCompleteStage('insight');
      if (!(todayProgress?.checkInCompleted ?? false)) {
        navigation.navigate('CheckIn');
      } else {
        navigation.navigate('Passage', { checkInValue: 50 });
      }
    }

    // Save in background — refreshProgress will confirm the optimistic state
    TodayService.markInsightComplete(user.id)
      .then(() => refreshProgress())
      .catch((err) => console.error('Error marking insight complete:', err));
  };

  if (!reflection) {
    return (
      <LinearGradient
        colors={['#2A1A5E', '#5C3D9E', '#8F6CC8']}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No reflection available for this passage</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2A1A5E', '#5C3D9E', '#8F6CC8']}
      style={styles.gradientContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Today's Journey</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.popToTop()}>
            <Ionicons name="close" size={28} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress today</Text>
            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#FFB84D', '#FF8C42', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        {/* Journey Label */}
        <View style={styles.journeyLabelContainer}>
          <Text style={styles.journeyIcon}>✍️</Text>
          <Text style={styles.journeyLabel}>PERSONALIZED INSIGHT</Text>
          <Text style={styles.journeyDuration}>• 3 MIN</Text>
        </View>

        {/* Scrollable Insight Text */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDot}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.insightText}>{reflection}</Text>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
            <Text style={styles.chatButtonText}>Chat to Learn More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, submitting && styles.iconButtonDisabled]}
            onPress={handleFinish}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  journeyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: 6,
  },
  journeyIcon: {
    fontSize: 18,
  },
  journeyLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  journeyDuration: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  ornamentDot: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  insightText: {
    fontSize: 20,
    lineHeight: 34,
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.sm + 4,
    gap: 6,
  },
  chatButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  retryButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
