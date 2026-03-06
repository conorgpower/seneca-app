import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';

export default function FocusLockSetupScreen() {
  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="What is Focus Lock?" />
        <View style={styles.card}>
          <Text style={styles.noteText}>
            Focus Lock lets you block distracting apps until you read your daily wisdom in Seneca Chat. It uses Apple's Screen Time to shield selected apps with a "Time for Wisdom" screen.
          </Text>
        </View>

        <SectionHeader title="How to Set Up" />
        <View style={styles.card}>
          <Text style={styles.stepText}>1. Go to the <Text style={styles.bold}>Focus</Text> tab in the bottom navigation bar.</Text>
          <Text style={styles.stepText}>2. Tap <Text style={styles.bold}>Enable Screen Time Access</Text> and grant permission.</Text>
          <Text style={styles.stepText}>3. Tap <Text style={styles.bold}>Select Apps to Lock</Text> and choose the apps you want to block.</Text>
          <Text style={styles.stepText}>4. Tap <Text style={styles.bold}>Lock Apps</Text> to activate.</Text>
        </View>

        <SectionHeader title="How It Works" />
        <View style={styles.card}>
          <Text style={styles.stepText}>When locked, a <Text style={styles.bold}>"Time for Wisdom"</Text> screen appears when you try to open a selected app.</Text>
          <Text style={styles.stepText}>Tap <Text style={styles.bold}>Dismiss</Text> to close the shield, then open Seneca Chat.</Text>
          <Text style={styles.stepText}>Complete your daily wisdom reading to <Text style={styles.bold}>unlock all apps</Text> for the rest of the day.</Text>
        </View>

        <SectionHeader title="Requirements" />
        <View style={styles.card}>
          <Text style={styles.noteText}>
            Focus Lock requires iOS 16 or later. Screen Time permission must be granted for Seneca Chat to manage app restrictions.
          </Text>
        </View>

        {Platform.OS === 'ios' && (
          <>
            <SectionHeader title="Troubleshooting" />
            <SettingsRow
              type="navigate"
              label="Open iPhone Settings"
              icon="⚙️"
              subtitle="If Focus Lock isn't working, check Screen Time permissions."
              onPress={() => {
                Linking.openSettings().catch(() => {
                  Alert.alert('Unable to Open Settings', 'Please open the iPhone Settings app manually.');
                });
              }}
              isFirst
              isLast
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  noteText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  bold: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
