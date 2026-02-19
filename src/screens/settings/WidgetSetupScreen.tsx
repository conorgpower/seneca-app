import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';

function openIosSettings() {
  if (Platform.OS !== 'ios') {
    Alert.alert('iPhone Only', 'Widget setup is currently available on iPhone.');
    return;
  }

  Linking.openSettings().catch(() => {
    Alert.alert('Unable to Open Settings', 'Please open the iPhone Settings app manually.');
  });
}

export default function WidgetSetupScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Add to Lock Screen" />
        <View style={styles.card}>
          <Text style={styles.stepText}>1. Long-press your iPhone Lock Screen, then tap <Text style={styles.bold}>Customize</Text>.</Text>
          <Text style={styles.stepText}>2. Tap <Text style={styles.bold}>Lock Screen</Text>, then tap the widget area.</Text>
          <Text style={styles.stepText}>3. Search for <Text style={styles.bold}>Seneca Chat</Text> and select a lock screen style.</Text>
          <Text style={styles.stepText}>4. Tap <Text style={styles.bold}>Done</Text> to save.</Text>
        </View>

        <SectionHeader title="Add to Home Screen" />

        <View style={styles.card}>
          <Text style={styles.stepText}>1. Long-press any empty area on your iPhone Home Screen.</Text>
          <Text style={styles.stepText}>2. Tap the <Text style={styles.bold}>Edit</Text> button, then tap <Text style={styles.bold}>Add Widget</Text>.</Text>
          <Text style={styles.stepText}>3. Search for <Text style={styles.bold}>Seneca Chat</Text> and open it.</Text>
          <Text style={styles.stepText}>4. Choose your widget size and tap <Text style={styles.bold}>Add Widget</Text>.</Text>
          <Text style={styles.stepText}>5. Tap <Text style={styles.bold}>Done</Text>.</Text>
        </View>

        <SectionHeader title="Important" />
        <View style={styles.card}>
          <Text style={styles.noteText}>
            Open the app and visit Today once each day so the latest Wisdom of the Day can sync to the widget.
          </Text>
        </View>

        <SectionHeader title="Troubleshooting" />
        <SettingsRow
          type="navigate"
          label="Open iPhone Settings"
          icon="⚙️"
          subtitle="If the widget doesn't appear, check app permissions and restart the device."
          onPress={openIosSettings}
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
