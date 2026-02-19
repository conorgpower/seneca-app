import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../theme';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import { updateCachedPrefs } from '../../hooks/useAppPreferences';

const PREFS_KEY = '@seneca_appearance_prefs';

interface AppearancePrefs {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const DEFAULT_PREFS: AppearancePrefs = {
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
};

export default function AppearanceSettingsScreen() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_PREFS);

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
      console.error('Error loading appearance prefs:', err);
    }
  };

  const savePrefs = async (updated: AppearancePrefs) => {
    setPrefs(updated);
    updateCachedPrefs(updated);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving appearance prefs:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Theme" />
        <SettingsRow
          type="value"
          label="Appearance"
          icon="🎨"
          value="Dark"
          onPress={() => {
            Alert.alert('Coming Soon', 'Light and system themes will be available in a future update.');
          }}
          isFirst
          isLast
        />

        <SectionHeader title="Sound & Haptics" />
        <SettingsRow
          type="toggle"
          label="Sound Effects"
          icon="🔊"
          value={prefs.soundEnabled}
          onValueChange={(v) => savePrefs({ ...prefs, soundEnabled: v })}
          isFirst
        />
        <SettingsRow
          type="toggle"
          label="Haptic Feedback"
          icon="📳"
          value={prefs.hapticsEnabled}
          onValueChange={(v) => savePrefs({ ...prefs, hapticsEnabled: v })}
          isLast
        />

        <SectionHeader title="Text" />
        <SettingsRow
          type="value"
          label="Text Size"
          icon="🔤"
          value="System Default"
          onPress={() => {
            Alert.alert('Coming Soon', 'Custom text sizing will be available in a future update.');
          }}
          isFirst
          isLast
        />
      </ScrollView>
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
});
