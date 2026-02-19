import React from 'react';
import { ScrollView, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { theme } from '../../theme';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function SafetySupportScreen() {
  const navigation = useNavigation<Nav>();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const getDeviceInfo = () => {
    return `\n\n---\nApp Version: ${appVersion}\nPlatform: ${Platform.OS} ${Platform.Version}`;
  };

  const openMailto = async (subject: string, body: string) => {
    const url = `mailto:hello@senecachat.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'No Mail App',
        'Please email us at hello@senecachat.com',
        [{ text: 'OK' }],
      );
    }
  };

  const handleContactSupport = () => {
    openMailto('Seneca Chat Support', `Hi Seneca Team,\n\nI need help with:\n\n${getDeviceInfo()}`);
  };

  const handleReportProblem = () => {
    openMailto('Bug Report - Seneca Chat', `What happened:\n\nWhat I expected:\n\nSteps to reproduce:\n${getDeviceInfo()}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Help" />
        <SettingsRow
          type="navigate"
          label="Help & FAQ"
          icon="❓"
          onPress={() => navigation.navigate('HelpFAQ')}
          isFirst
        />
        <SettingsRow
          type="link"
          label="Contact Support"
          icon="✉️"
          subtitle="hello@senecachat.com"
          onPress={handleContactSupport}
        />
        <SettingsRow
          type="link"
          label="Report a Problem"
          icon="🐛"
          subtitle="Send us a bug report via email"
          onPress={handleReportProblem}
          isLast
        />

        <SectionHeader title="Community" />
        <SettingsRow
          type="navigate"
          label="Community Guidelines"
          icon="📜"
          onPress={() =>
            navigation.navigate('LegalDocument', {
              documentKey: 'community',
              title: 'Community Guidelines',
            })
          }
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
