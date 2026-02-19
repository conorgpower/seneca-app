import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';

const { width, height } = Dimensions.get('window');

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const { user, signOut } = useAuth();
  const { currentStreak } = useToday();
  const navigation = useNavigation<any>();
  const slideAnim = React.useRef(new Animated.Value(-width * 0.85)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.85,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || 'user@example.com';
  const userInitial = (userName?.charAt(0)?.toUpperCase() || 'U');

  const streakCurrent = currentStreak?.current_streak ?? 0;
  const streakLongest = currentStreak?.longest_streak ?? 0;

  const navigateTo = (screen: string) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 150);
  };

  const menuSections = [
    { id: 'account', icon: '👤', label: 'Account', screen: 'AccountSettings' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', screen: 'NotificationSettings' },
    { id: 'appearance', icon: '🎨', label: 'Appearance', screen: 'AppearanceSettings' },
    { id: 'widget-setup', icon: '📱', label: 'Widget Setup', screen: 'WidgetSetup' },
    { id: 'privacy', icon: '🔒', label: 'Privacy & Data', screen: 'PrivacySettings' },
    { id: 'safety', icon: '🛡️', label: 'Safety & Support', screen: 'SafetySupport' },
    { id: 'legal', icon: '📄', label: 'Legal', screen: 'Legal' },
    { id: 'about', icon: 'ℹ️', label: 'About', screen: 'About' },
  ];

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  // Guard against undefined user data
  if (!visible || !userName || !userEmail || !userInitial) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Profile Header */}
                <View style={styles.header}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.initialLarge}>{userInitial}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.nameContainer}>
                      <Text style={styles.userName}>{userName}</Text>
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedIcon}>✓</Text>
                      </View>
                    </View>
                    <Text style={styles.userEmail}>
                      {userEmail ? `@${userEmail.split('@')[0]}` : '@user'}
                    </Text>
                  </View>
                </View>

                {/* Streak Cards */}
                <View style={styles.streakContainer}>
                  <View style={[styles.streakCard, styles.streakCardLeft]}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={styles.streakNumber}>{streakCurrent}</Text>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                  </View>
                  <View style={styles.streakCard}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={styles.streakNumber}>{streakLongest}</Text>
                    <Text style={styles.streakLabel}>Longest Streak</Text>
                  </View>
                </View>

                {/* Settings Sections */}
                <View style={styles.menuSection}>
                  {menuSections.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => navigateTo(item.screen)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={styles.menuIcon}>
                          <Text style={styles.menuIconText}>{item.icon}</Text>
                        </View>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  drawer: {
    width: width * 0.85,
    height: height,
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5A54B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  initialLarge: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    gap: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  streakContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  streakCardLeft: {
    marginRight: 0,
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  menuSection: {
    padding: 16,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: {
    fontSize: 20,
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: theme.colors.text,
  },
  menuArrow: {
    fontSize: 28,
    color: theme.colors.textSecondary,
    fontWeight: '300',
  },
  signOutButton: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF4444',
  },
});
