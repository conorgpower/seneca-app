import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Dimensions,
  ImageBackground,
  Image,
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
import { BookOpenIcon, ArrowRightIcon, ShareIcon, ChatBubbleLeftIcon } from 'react-native-heroicons/solid';
import { triggerHaptic } from '../hooks/useAppPreferences';
import { AnimatedMeshGradient } from '../components/AnimatedMeshGradient';
import { getSupabaseImageSource } from '../data/asset-cdn';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Passage'>;
type PassageRouteProp = RouteProp<MainStackParamList, 'Passage'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PASSAGE_BG_IMAGE = getSupabaseImageSource('images/background-quote.webp');

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

  // Adapt font size based on passage length and screen size
  const getPassageTextStyle = () => {
    const len = passage?.condensed_passage?.length || 0;
    const isSmallScreen = SCREEN_HEIGHT < 700;

    let fontSize = theme.typography.sizes.lg; // default ~18
    let lineHeight = 30;

    if (len > 400 || isSmallScreen) {
      fontSize = 14;
      lineHeight = 22;
    } else if (len > 250) {
      fontSize = 15;
      lineHeight = 24;
    } else if (len > 150) {
      fontSize = 16;
      lineHeight = 26;
    }

    return { fontSize, lineHeight };
  };

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
    navigation.navigate('App' as any, {
      screen: 'Chat',
      params: {
        initialContext: passage.condensed_passage,
        initialMessage: `Help me understand this passage: "${passage.condensed_passage}"`,
      },
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

  const renderLoadingOrError = (message: string, isError?: boolean) => (
    <View style={styles.container}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        borderRadius={0}
        baseColors={['#1C1B1E', '#2A2520']}
        blobColors={['#DEAD5C', '#8B7355']}
        duration={10000}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centeredContainer}>
          {isError ? (
            <>
              <Text style={styles.errorText}>{message}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPassage}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{message}</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );

  if (loading) return renderLoadingOrError('Loading today\'s passage...');
  if (!passage) return renderLoadingOrError('No passage available', true);

  return (
    <View style={styles.container}>
      <AnimatedMeshGradient
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        borderRadius={0}
        baseColors={['#1C1B1E', '#2A2520']}
        blobColors={['#DEAD5C', '#8B7355']}
        duration={10000}
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
          <BookOpenIcon size={18} color="rgba(255, 255, 255, 0.85)" />
          <Text style={styles.journeyLabel}>PASSAGE OF THE DAY</Text>
          <Text style={styles.journeyDuration}>• 1 MIN</Text>
        </View>

        {/* Scrollable Passage Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {PASSAGE_BG_IMAGE ? (
            <View style={styles.passageCard}>
              <Image
                source={PASSAGE_BG_IMAGE}
                style={styles.passageCardImage}
              />
              <View style={styles.passageCardOverlay}>
                <Text style={[styles.passageText, getPassageTextStyle()]}>{passage.condensed_passage}</Text>
                <View style={styles.attribution}>
                  <Text style={styles.attributionText}>— {passage.source_author}</Text>
                  <Text style={styles.workText}>{passage.source_work}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.passageCard, styles.passageCardFallback]}>
              <Text style={[styles.passageText, getPassageTextStyle()]}>{passage.condensed_passage}</Text>
              <View style={styles.attribution}>
                <Text style={styles.attributionText}>— {passage.source_author}</Text>
                <Text style={styles.workText}>{passage.source_work}</Text>
              </View>
            </View>
          )}
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
            onPress={handleContinue}
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
    backgroundColor: '#1C1B1E',
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  passageCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  passageCardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: theme.borderRadius.lg,
  },
  passageCardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  passageCardFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: theme.spacing.xl,
  },
  passageText: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: 30,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  attribution: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: theme.spacing.md,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  workText: {
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
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
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing.lg,
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
