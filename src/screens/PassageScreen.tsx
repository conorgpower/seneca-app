import React, { useState, useEffect } from 'react';
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
import * as PassageService from '../services/philosophical-passages.service';
import type { MainStackParamList } from '../navigation/MainNavigator';
import type { PhilosophicalPassage } from '../services/philosophical-passages.service';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../hooks/useAppPreferences';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Passage'>;
type PassageRouteProp = RouteProp<MainStackParamList, 'Passage'>;

export default function PassageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PassageRouteProp>();
  const { user } = useAuth();
  const {
    todayProgress,
    dailyPassage,
    currentStreak,
    optimisticallyCompleteStage,
    optimisticallyCompleteToday,
  } = useToday();
  const { checkInValue } = route.params;

  const [passage, setPassage] = useState<PhilosophicalPassage | null>(dailyPassage);
  const [loading, setLoading] = useState(!dailyPassage);
  const [submitting, setSubmitting] = useState(false);

  const progress = todayProgress?.progressPercentage || 0;

  useEffect(() => {
    loadPassage();
  }, []);



  const loadPassage = async () => {
    try {
      const dailyPassage = await PassageService.getDailyPassage();
      setPassage(dailyPassage);
    } catch (error) {
      console.error('Error loading passage:', error);
      alert('Failed to load passage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!passage) return;
    try {
      await Share.share({
        message: `"${passage.condensed_passage}"\n\n— ${passage.source_author}, ${passage.source_work}`,
        title: 'Philosophical Passage',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleChat = () => {
    if (!passage) return;
    navigation.navigate('Chat' as any, {
      initialContext: passage.condensed_passage,
      initialMessage: `Help me understand this passage: "${passage.condensed_passage}"`,
    });
  };

  const handleContinue = () => {
    if (!user || !passage) return;

    triggerHaptic('success');
    const alreadyComplete =
      (todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.passageCompleted ?? false) &&
      (todayProgress?.insightCompleted ?? false);
    const willCompleteToday =
      !alreadyComplete &&
      !(todayProgress?.passageCompleted ?? false) &&
      (todayProgress?.checkInCompleted ?? false) &&
      (todayProgress?.insightCompleted ?? false);

    if (willCompleteToday) {
      const newStreak = (currentStreak?.current_streak || 0) + 1;
      optimisticallyCompleteToday();
      navigation.navigate('Streak', { newStreak });
    } else {
      optimisticallyCompleteStage('passage');
      navigation.navigate('Insight', {
        passageId: passage.id,
        reflection: passage.reflection || '',
      });
    }

    // Save in background
    TodayService.markPassageComplete(user.id, passage.id)
      .catch((err) => console.error('Error marking passage complete:', err));
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#4A90A4', '#5FA3B8', '#74B6CC']}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading today's passage...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!passage) {
    return (
      <LinearGradient
        colors={['#4A90A4', '#5FA3B8', '#74B6CC']}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No passage available</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPassage}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4A90A4', '#5FA3B8', '#74B6CC']}
      style={styles.gradientContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Today's Journey</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.popToTop()}>
            <Ionicons name="close" size={28} color="rgba(0, 0, 0, 0.7)" />
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
          <Text style={styles.journeyIcon}>📖</Text>
          <Text style={styles.journeyLabel}>PASSAGE OF THE DAY</Text>
          <Text style={styles.journeyDuration}>• 1 MIN</Text>
        </View>

        {/* Scrollable Passage Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.passageCard}>
            <Text style={styles.passageText}>{passage.condensed_passage}</Text>
            <View style={styles.attribution}>
              <Text style={styles.attributionText}>— {passage.source_author}</Text>
              <Text style={styles.workText}>{passage.source_work}</Text>
            </View>
          </View>
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
            onPress={handleContinue}
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
    color: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#000000',
  },
  progressPercentage: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    color: 'rgba(0, 0, 0, 0.8)',
    letterSpacing: 1,
  },
  journeyDuration: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  passageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  passageText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: 30,
    color: '#000000',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  attribution: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: theme.spacing.md,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#000000',
    marginBottom: theme.spacing.xs,
  },
  workText: {
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.sm + 4,
    gap: 6,
  },
  chatButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
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
