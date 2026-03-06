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
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import {
  UserIcon,
  BellIcon,
  SwatchIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  FireIcon,
  CameraIcon,
} from 'react-native-heroicons/solid';
import { useAuth } from '../contexts/AuthContext';
import { useToday } from '../contexts/TodayContext';
import { pickAndUploadAvatar } from '../services/avatar.service';

const { width, height } = Dimensions.get('window');

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const { user, signOut, refreshSession } = useAuth();
  const { currentStreak } = useToday();
  const navigation = useNavigation<any>();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const DRAWER_WIDTH = width * 0.85;
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      // Mount the modal first, then animate in
      setModalVisible(true);
      slideAnim.setValue(-DRAWER_WIDTH);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      // Animate out, then unmount
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || 'user@example.com';
  const userInitial = (userName?.charAt(0)?.toUpperCase() || 'U');

  const streakCurrent = currentStreak?.current_streak ?? 0;
  const streakLongest = currentStreak?.longest_streak ?? 0;

  const animateClose = React.useCallback((afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
      afterClose?.();
    });
  }, [slideAnim, overlayAnim, DRAWER_WIDTH, onClose]);

  const navigateTo = (screen: string) => {
    animateClose(() => {
      navigation.navigate(screen);
    });
  };

  const iconColor = theme.colors.tertiary;
  const iconSize = 20;

  const menuSections = [
    { id: 'account', icon: <UserIcon size={iconSize} color={iconColor} />, label: 'Account', screen: 'AccountSettings' },
    { id: 'notifications', icon: <BellIcon size={iconSize} color={iconColor} />, label: 'Notifications', screen: 'NotificationSettings' },
    { id: 'appearance', icon: <SwatchIcon size={iconSize} color={iconColor} />, label: 'Appearance', screen: 'AppearanceSettings' },
    { id: 'widget-setup', icon: <DevicePhoneMobileIcon size={iconSize} color={iconColor} />, label: 'Widget Setup', screen: 'WidgetSetup' },
    { id: 'focus-lock', icon: <LockClosedIcon size={iconSize} color={iconColor} />, label: 'Focus Lock Setup', screen: 'FocusLockSetup' },
    { id: 'privacy', icon: <LockClosedIcon size={iconSize} color={iconColor} />, label: 'Privacy & Data', screen: 'PrivacySettings' },
    { id: 'safety', icon: <ShieldCheckIcon size={iconSize} color={iconColor} />, label: 'Safety & Support', screen: 'SafetySupport' },
    { id: 'legal', icon: <DocumentTextIcon size={iconSize} color={iconColor} />, label: 'Legal', screen: 'Legal' },
    { id: 'about', icon: <InformationCircleIcon size={iconSize} color={iconColor} />, label: 'About', screen: 'About' },
  ];

  const handleAvatarPress = () => {
    Alert.alert('Change Profile Photo', '', [
      {
        text: 'Choose from Library',
        onPress: async () => {
          if (!user?.id) return;
          setUploadingAvatar(true);
          await pickAndUploadAvatar(user.id, 'library', refreshSession);
          setUploadingAvatar(false);
        },
      },
      {
        text: 'Take Photo',
        onPress: async () => {
          if (!user?.id) return;
          setUploadingAvatar(true);
          await pickAndUploadAvatar(user.id, 'camera', refreshSession);
          setUploadingAvatar(false);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = async () => {
    animateClose(async () => {
      await signOut();
    });
  };

  if (!modalVisible || !userName || !userEmail || !userInitial) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => animateClose()}
    >
      <TouchableWithoutFeedback onPress={() => animateClose()}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
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
                  <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarWrapper}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
                    ) : (
                      <View style={[styles.avatarLarge, styles.avatarLargeFallback]}>
                        <Text style={styles.initialLarge}>{userInitial}</Text>
                      </View>
                    )}
                    {uploadingAvatar && (
                      <View style={styles.avatarLoadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.cameraIconBadge}>
                      <CameraIcon size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
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
                    <FireIcon size={24} color={theme.colors.primary} style={styles.streakIcon} />
                    <Text style={styles.streakNumber}>{streakCurrent}</Text>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                  </View>
                  <View style={styles.streakCard}>
                    <FireIcon size={24} color={theme.colors.primary} style={styles.streakIcon} />
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
                          {item.icon}
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
        </Animated.View>
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
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  avatarLargeFallback: {
    backgroundColor: '#E5A54B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
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
  streakIcon: {
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
