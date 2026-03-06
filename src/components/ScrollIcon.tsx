import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import {
  FireIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  LockClosedIcon,
  TrophyIcon,
  StarIcon,
  AcademicCapIcon,
  HeartIcon,
} from 'react-native-heroicons/solid';
import type { AchievementId } from '../data/achievements';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  // Daily Rituals
  first_dawn: StarIcon,
  week_of_wisdom: FireIcon,
  month_of_virtue: TrophyIcon,
  century_of_practice: AcademicCapIcon,
  ten_completions: FireIcon,
  fifty_completions: TrophyIcon,
  hundred_completions: AcademicCapIcon,
  // Audio
  first_lesson: SpeakerWaveIcon,
  three_lessons: SpeakerWaveIcon,
  all_lessons: SpeakerWaveIcon,
  // Breathwork
  first_breath: SparklesIcon,
  three_breaths: SparklesIcon,
  all_breaths: SparklesIcon,
  // Comics
  first_comic: BookOpenIcon,
  five_comics: BookOpenIcon,
  all_comics: BookOpenIcon,
  // Books
  first_book: BookOpenIcon,
  all_books: AcademicCapIcon,
  // Community
  first_reflection: ChatBubbleLeftIcon,
  five_reflections: ChatBubbleLeftIcon,
  // Chat
  first_conversation: ChatBubbleLeftIcon,
  ten_conversations: ChatBubbleLeftIcon,
  // Special
  focus_lock_activated: LockClosedIcon,
  check_in_variety: HeartIcon,
};

type ScrollIconSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<ScrollIconSize, { container: number; icon: number; curl: number }> = {
  sm: { container: 48, icon: 20, curl: 6 },
  md: { container: 64, icon: 26, curl: 8 },
  lg: { container: 80, icon: 32, curl: 10 },
};

interface ScrollIconProps {
  achievementId: AchievementId | string;
  unlocked: boolean;
  size?: ScrollIconSize;
}

export default function ScrollIcon({ achievementId, unlocked, size = 'md' }: ScrollIconProps) {
  const dims = SIZE_MAP[size];
  const IconComponent = ICON_MAP[achievementId] || StarIcon;

  return (
    <View
      style={[
        styles.container,
        {
          width: dims.container,
          height: dims.container,
          borderRadius: dims.container / 2,
        },
        unlocked ? styles.containerUnlocked : styles.containerLocked,
      ]}
    >
      {/* Top curl */}
      <View
        style={[
          styles.curl,
          styles.curlTop,
          { width: dims.curl, height: dims.curl, borderRadius: dims.curl / 2 },
          unlocked ? styles.curlUnlocked : styles.curlLocked,
        ]}
      />
      {/* Bottom curl */}
      <View
        style={[
          styles.curl,
          styles.curlBottom,
          { width: dims.curl, height: dims.curl, borderRadius: dims.curl / 2 },
          unlocked ? styles.curlUnlocked : styles.curlLocked,
        ]}
      />

      <IconComponent
        size={dims.icon}
        color={unlocked ? theme.colors.primary : theme.colors.textTertiary}
      />

      {!unlocked && (
        <View style={styles.lockOverlay}>
          <LockClosedIcon size={dims.icon * 0.5} color={theme.colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  containerUnlocked: {
    backgroundColor: 'rgba(222, 173, 92, 0.15)',
    borderColor: theme.colors.primary,
  },
  containerLocked: {
    backgroundColor: theme.colors.backgroundCard,
    borderColor: theme.colors.border,
  },
  curl: {
    position: 'absolute',
  },
  curlTop: {
    top: -3,
    right: -3,
  },
  curlBottom: {
    bottom: -3,
    left: -3,
  },
  curlUnlocked: {
    backgroundColor: theme.colors.primary,
  },
  curlLocked: {
    backgroundColor: theme.colors.border,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});
