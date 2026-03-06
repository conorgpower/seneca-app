import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Dimensions,
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
import { PencilSquareIcon, ArrowRightIcon, ShareIcon, ChatBubbleLeftIcon } from 'react-native-heroicons/solid';
import { triggerHaptic } from '../hooks/useAppPreferences';
import { AnimatedMeshGradient } from '../components/AnimatedMeshGradient';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Insight'>;
type InsightRouteProp = RouteProp<MainStackParamList, 'Insight'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    navigation.navigate('App' as any, {
      screen: 'Chat',
      params: {
        initialContext: reflection,
        initialMessage: `Help me apply this insight: "${reflection}"`,
      },
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
      <View style={styles.container}>
        <AnimatedMeshGradient
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          borderRadius={0}
          baseColors={['#151535', '#2A1A5E']}
          blobColors={['#5C8EDE', '#9E7ABB']}
          duration={12000}
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.centeredContainer}>
            <Text style={styles.errorText}>No reflection available for this passage</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        borderRadius={0}
        baseColors={['#151535', '#2A1A5E']}
        blobColors={['#5C8EDE', '#9E7ABB']}
        duration={12000}
      />
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
          <PencilSquareIcon size={18} color="rgba(255, 255, 255, 0.85)" />
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
            <ShareIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <ChatBubbleLeftIcon size={16} color="#FFFFFF" />
            <Text style={styles.chatButtonText}>Chat to Learn More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
            onPress={handleFinish}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <ArrowRightIcon size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151535',
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
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  journeyLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  journeyDuration: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.sm + 4,
    gap: 6,
  },
  chatButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  centeredContainer: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
