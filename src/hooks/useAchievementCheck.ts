import { useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAchievementToast } from '../contexts/AchievementToastContext';
import * as AchievementsService from '../services/achievements.service';

type AchievementCategory = 'streak' | 'content' | 'community' | 'chat' | 'focus' | 'checkin';

/**
 * Hook that checks achievements and shows toast notifications for newly unlocked ones.
 * Returns a fire-and-forget function that can be called from screens.
 */
export function useAchievementCheck() {
  const { user } = useAuth();
  const { showAchievementToast } = useAchievementToast();
  const toastRef = useRef(showAchievementToast);
  toastRef.current = showAchievementToast;

  const checkAndNotify = useCallback(
    (category: AchievementCategory) => {
      if (!user) return;
      AchievementsService.checkAchievements(user.id, category)
        .then(({ data }) => {
          for (const achievementId of data) {
            toastRef.current(achievementId);
          }
        })
        .catch(console.error);
    },
    [user]
  );

  const logContentAndCheck = useCallback(
    (contentType: 'audio_lesson' | 'breathwork' | 'comic' | 'book', contentId: string) => {
      if (!user) return;
      AchievementsService.logContentAccess(user.id, contentType, contentId)
        .then(() => AchievementsService.checkAchievements(user.id, 'content'))
        .then(({ data }) => {
          for (const achievementId of data) {
            toastRef.current(achievementId);
          }
        })
        .catch(console.error);
    },
    [user]
  );

  return { checkAndNotify, logContentAndCheck };
}
