import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../theme';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import {
  requestNotificationPermissions,
  scheduleReminders,
  cancelAllReminders,
} from '../../services/notifications.service';
import { syncNotificationPrefs } from '../../services/push-token.service';
import { useAuth } from '../../contexts/AuthContext';

const PREFS_KEY = '@seneca_notification_prefs';
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface NotificationPrefs {
  pushEnabled: boolean;
  dailyReminder: boolean;
  streakReminder: boolean;
  communityUpdates: boolean;
  reminderHour: number;
  reminderMinute: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  dailyReminder: true,
  streakReminder: true,
  communityUpdates: false,
  reminderHour: 9,
  reminderMinute: 0,
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function WheelPicker({
  data,
  selectedIndex,
  onSelect,
}: {
  data: number[];
  selectedIndex: number;
  onSelect: (value: number) => void;
}) {
  const flatListRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    // Scroll to selected index on mount
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      onSelect(data[clampedIndex]);
      isScrolling.current = false;
    },
    [data, onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <View style={wheelStyles.item}>
        <Text style={wheelStyles.itemText}>
          {item.toString().padStart(2, '0')}
        </Text>
      </View>
    ),
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={wheelStyles.container}>
      <View style={wheelStyles.highlight} pointerEvents="none" />
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.toString()}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
      />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    flex: 1,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } catch (err) {
      console.error('Error loading notification prefs:', err);
    }
    setLoaded(true);
  };

  const savePrefs = async (updated: NotificationPrefs) => {
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      await syncReminders(updated);
      // Sync to Supabase so the server knows the user's preferences
      if (user) {
        syncNotificationPrefs(user.id, updated).catch(() => {});
      }
    } catch (err) {
      console.error('Error saving notification prefs:', err);
    }
  };

  const syncReminders = async (p: NotificationPrefs) => {
    if (!p.pushEnabled || !p.dailyReminder) {
      await cancelAllReminders();
      return;
    }
    const allDays = [1, 2, 3, 4, 5, 6, 7];
    await scheduleReminders(p.reminderHour, p.reminderMinute, allDays);
  };

  const handleTogglePush = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in your device settings to receive reminders.',
        );
        return;
      }
    }
    savePrefs({ ...prefs, pushEnabled: value });
  };

  const openTimePicker = () => {
    setTempHour(prefs.reminderHour);
    setTempMinute(prefs.reminderMinute);
    setShowTimePicker(true);
  };

  const confirmTime = () => {
    setShowTimePicker(false);
    savePrefs({
      ...prefs,
      reminderHour: tempHour,
      reminderMinute: tempMinute,
    });
  };

  if (!loaded) return null;

  const timeDisplay = `${prefs.reminderHour.toString().padStart(2, '0')}:${prefs.reminderMinute.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Push Notifications" />
        <SettingsRow
          type="toggle"
          label="Push Notifications"
          icon="🔔"
          value={prefs.pushEnabled}
          onValueChange={handleTogglePush}
          isFirst
          isLast
        />

        <SectionHeader title="Reminders" />
        <SettingsRow
          type="toggle"
          label="Daily Reminder"
          icon="📅"
          value={prefs.dailyReminder}
          onValueChange={(v) => savePrefs({ ...prefs, dailyReminder: v })}
          disabled={!prefs.pushEnabled}
          isFirst
        />
        <SettingsRow
          type="toggle"
          label="Streak Reminder"
          icon="🔥"
          value={prefs.streakReminder}
          onValueChange={(v) => savePrefs({ ...prefs, streakReminder: v })}
          disabled={!prefs.pushEnabled}
        />
        <SettingsRow
          type="toggle"
          label="Community Updates"
          icon="👥"
          value={prefs.communityUpdates}
          onValueChange={(v) => savePrefs({ ...prefs, communityUpdates: v })}
          disabled={!prefs.pushEnabled}
          isLast
        />

        <SectionHeader title="Schedule" />
        <SettingsRow
          type="value"
          label="Reminder Time"
          icon="🕐"
          value={timeDisplay}
          onPress={openTimePicker}
          isFirst
          isLast
        />
      </ScrollView>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          {/* Tappable backdrop area - closes picker */}
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          />
          {/* Picker content - not nested inside the touchable so FlatList can scroll */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Reminder Time</Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelsRow}>
              <WheelPicker
                data={HOURS}
                selectedIndex={tempHour}
                onSelect={setTempHour}
              />
              <Text style={styles.colonSeparator}>:</Text>
              <WheelPicker
                data={MINUTES}
                selectedIndex={tempMinute}
                onSelect={setTempMinute}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pickerCancel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 8,
  },
  colonSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: 4,
  },
});
