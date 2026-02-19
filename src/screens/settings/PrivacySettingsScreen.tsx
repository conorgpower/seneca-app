import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';

export default function PrivacySettingsScreen() {
  const { user, signOut } = useAuth();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Conversation History',
      'This will permanently delete all your conversations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                const { error } = await supabase
                  .from('conversations')
                  .delete()
                  .eq('user_id', user.id);
                if (error) throw error;
              }
              Alert.alert('Done', 'Your conversation history has been cleared.');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear history. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your data, progress, and streaks will be permanently lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Flag the account for deletion
                      // In production, handle this server-side
                      if (user?.id) {
                        await supabase
                          .from('user_profiles')
                          .update({ deletion_requested_at: new Date().toISOString() })
                          .eq('id', user.id);
                      }
                      Alert.alert(
                        'Account Deletion Requested',
                        'Your account has been flagged for deletion. It will be permanently removed within 30 days. You will now be signed out.',
                        [
                          {
                            text: 'OK',
                            onPress: () => signOut(),
                          },
                        ],
                      );
                    } catch (err) {
                      Alert.alert('Error', 'Failed to process request. Please contact support.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Privacy Policy" />
        <SettingsRow
          type="link"
          label="Privacy Policy"
          icon="📋"
          onPress={() => Linking.openURL('https://senecaapp.com/privacy')}
          isFirst
          isLast
        />

        <SectionHeader title="Data Controls" />
        <SettingsRow
          type="navigate"
          label="Clear Conversation History"
          icon="🗑️"
          onPress={handleClearHistory}
          isFirst
        />
        <SettingsRow
          type="navigate"
          label="Download My Data"
          icon="📥"
          subtitle="Coming Soon"
          onPress={() => Alert.alert('Coming Soon', 'Data export will be available in a future update.')}
        />
        <SettingsRow
          type="destructive"
          label="Delete My Account"
          icon="⚠️"
          onPress={handleDeleteAccount}
          isLast
        />

        <SectionHeader title="Analytics" />
        <SettingsRow
          type="toggle"
          label="Share Analytics"
          icon="📊"
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
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
