import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { getAchievementById } from '../data/achievements';
import { triggerHaptic } from '../hooks/useAppPreferences';
import ScrollIcon from '../components/ScrollIcon';
import { XMarkIcon } from 'react-native-heroicons/solid';

interface AchievementToastContextType {
  showAchievementToast: (achievementId: string) => void;
}

const AchievementToastContext = createContext<AchievementToastContextType | undefined>(undefined);

export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const [currentAchievementId, setCurrentAchievementId] = useState<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const isShowingRef = useRef(false);

  const dismiss = useCallback(() => {
    setCurrentAchievementId(null);
    isShowingRef.current = false;
    // Show next in queue if any
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      // Small delay so the modal closing animation finishes
      setTimeout(() => showAchievement(next), 400);
    }
  }, []);

  const showAchievement = useCallback((achievementId: string) => {
    isShowingRef.current = true;
    setCurrentAchievementId(achievementId);
    triggerHaptic('success');
  }, []);

  const showAchievementToast = useCallback((achievementId: string) => {
    if (isShowingRef.current) {
      queueRef.current.push(achievementId);
    } else {
      showAchievement(achievementId);
    }
  }, [showAchievement]);

  const handleSeeAll = useCallback(() => {
    dismiss();
    setTimeout(() => {
      navigation.navigate('AchievementsList');
    }, 300);
  }, [dismiss, navigation]);

  const achievement = currentAchievementId ? getAchievementById(currentAchievementId) : null;

  return (
    <AchievementToastContext.Provider value={{ showAchievementToast }}>
      {children}
      <Modal
        visible={!!achievement}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
              <XMarkIcon size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {achievement && (
              <>
                <Text style={styles.label}>Scroll Unlocked!</Text>
                <ScrollIcon achievementId={achievement.id} unlocked size="lg" />
                <Text style={styles.name}>{achievement.name}</Text>
                <Text style={styles.description}>{achievement.description}</Text>

                <View style={styles.conditionBox}>
                  <Text style={styles.conditionLabel}>How to unlock</Text>
                  <Text style={styles.condition}>{achievement.condition}</Text>
                </View>

                <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAll}>
                  <Text style={styles.seeAllText}>See All Scrolls</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AchievementToastContext.Provider>
  );
}

export function useAchievementToast() {
  const context = useContext(AchievementToastContext);
  if (!context) {
    throw new Error('useAchievementToast must be used within AchievementToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modal: {
    width: '100%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl + 8,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  name: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  conditionBox: {
    width: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  conditionLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  condition: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  seeAllButton: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  seeAllText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
