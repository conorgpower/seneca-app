import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import * as AchievementsService from '../services/achievements.service';
import {
  TOTAL_ACHIEVEMENTS,
  getAchievementCategories,
  getAchievementsByCategory,
} from '../data/achievements';
import type { AchievementDefinition } from '../data/achievements';
import { XMarkIcon, CheckCircleIcon } from 'react-native-heroicons/solid';
import { AppBackground } from '../components/AppBackground';
import ScrollIcon from '../components/ScrollIcon';

const { width: screenWidth } = Dimensions.get('window');
const CARD_GAP = theme.spacing.md;
const CARD_WIDTH = (screenWidth - theme.spacing.lg * 2 - CARD_GAP) / 2;

export default function AchievementsListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockedDates, setUnlockedDates] = useState<Record<string, string>>({});
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);

  useEffect(() => {
    if (!user) return;
    AchievementsService.getUserAchievements(user.id).then(({ data }) => {
      setUnlockedIds(new Set(data.map((a) => a.achievement_id)));
      const dates: Record<string, string> = {};
      for (const a of data) {
        dates[a.achievement_id] = new Date(a.unlocked_at).toLocaleDateString();
      }
      setUnlockedDates(dates);
    });
  }, [user]);

  const unlockedCount = unlockedIds.size;
  const progressPercent = Math.round((unlockedCount / TOTAL_ACHIEVEMENTS) * 100);
  const categories = getAchievementCategories();

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scrolls of Wisdom</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <XMarkIcon size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Progress Summary */}
            <View style={styles.progressSection}>
              <Text style={styles.progressText}>
                {unlockedCount} of {TOTAL_ACHIEVEMENTS} scrolls unlocked
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            {/* Category Sections */}
            {categories.map(({ category, label }) => {
              const achievements = getAchievementsByCategory(category);
              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{label}</Text>
                  <View style={styles.grid}>
                    {achievements.map((achievement) => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      return (
                        <TouchableOpacity
                          key={achievement.id}
                          style={styles.card}
                          activeOpacity={0.7}
                          onPress={() => setSelectedAchievement(achievement)}
                        >
                          <ScrollIcon
                            achievementId={achievement.id}
                            unlocked={isUnlocked}
                            size="md"
                          />
                          <Text
                            style={[
                              styles.cardName,
                              !isUnlocked && styles.cardNameLocked,
                            ]}
                            numberOfLines={2}
                          >
                            {achievement.name}
                          </Text>
                          <Text
                            style={[
                              styles.cardDescription,
                              !isUnlocked && styles.cardDescriptionLocked,
                            ]}
                            numberOfLines={2}
                          >
                            {achievement.description}
                          </Text>
                          {isUnlocked && unlockedDates[achievement.id] && (
                            <Text style={styles.cardDate}>
                              {unlockedDates[achievement.id]}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {selectedAchievement && (() => {
              const isUnlocked = unlockedIds.has(selectedAchievement.id);
              return (
                <>
                  <ScrollIcon
                    achievementId={selectedAchievement.id}
                    unlocked={isUnlocked}
                    size="lg"
                  />
                  <Text style={styles.modalName}>{selectedAchievement.name}</Text>
                  <Text style={styles.modalDescription}>
                    {selectedAchievement.description}
                  </Text>
                  <View style={styles.modalConditionRow}>
                    <Text style={styles.modalConditionLabel}>How to unlock</Text>
                    <Text style={styles.modalCondition}>
                      {selectedAchievement.condition}
                    </Text>
                  </View>
                  {isUnlocked && unlockedDates[selectedAchievement.id] ? (
                    <View style={styles.modalUnlockedBadge}>
                      <CheckCircleIcon size={16} color={theme.colors.primary} />
                      <Text style={styles.modalUnlockedText}>
                        Unlocked {unlockedDates[selectedAchievement.id]}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalLockedBadge}>
                      <Text style={styles.modalLockedText}>Locked</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  progressSection: {
    marginBottom: theme.spacing.xl,
  },
  progressText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  categorySection: {
    marginBottom: theme.spacing.xl,
  },
  categoryTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  cardNameLocked: {
    color: theme.colors.textTertiary,
  },
  cardDescription: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardDescriptionLocked: {
    color: theme.colors.textTertiary,
  },
  cardDate: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  modalName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  modalConditionRow: {
    width: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  modalConditionLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalCondition: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  modalUnlockedText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalLockedBadge: {
    marginTop: theme.spacing.xs,
  },
  modalLockedText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
});
