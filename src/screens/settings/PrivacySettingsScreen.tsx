import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { AppBackground } from '../../components/AppBackground';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  ClipboardDocumentListIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from 'react-native-heroicons/solid';
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
                      if (!user?.id) {
                        throw new Error('No authenticated user');
                      }

                      const { data: sessionData } = await supabase.auth.getSession();
                      const accessToken = sessionData.session?.access_token;
                      if (!accessToken) {
                        throw new Error('No active session');
                      }

                      const { error } = await supabase.functions.invoke('delete-account', {
                        body: {},
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                        },
                      });
                      if (error) throw error;

                      Alert.alert(
                        'Account Deleted',
                        'Your account and associated data have been permanently deleted.',
                        [
                          {
                            text: 'OK',
                            onPress: async () => {
                              try {
                                await signOut();
                              } catch {
                                // Session may already be invalid after deletion.
                              }
                            },
                          },
                        ],
                      );
                    } catch (err) {
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
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
    <AppBackground>
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
          icon={<ClipboardDocumentListIcon size={20} color={theme.colors.tertiary} />}
          onPress={() => Linking.openURL('https://senecaapp.com/privacy')}
          isFirst
          isLast
        />

        <SectionHeader title="Data Controls" />
        <SettingsRow
          type="navigate"
          label="Clear Conversation History"
          icon={<TrashIcon size={20} color={theme.colors.tertiary} />}
          onPress={handleClearHistory}
          isFirst
        />
        <SettingsRow
          type="navigate"
          label="Download My Data"
          icon={<ArrowDownTrayIcon size={20} color={theme.colors.tertiary} />}
          subtitle="Coming Soon"
          onPress={() => Alert.alert('Coming Soon', 'Data export will be available in a future update.')}
        />
        <SettingsRow
          type="destructive"
          label="Delete My Account"
          icon={<ExclamationTriangleIcon size={20} color="#FF4444" />}
          onPress={handleDeleteAccount}
          isLast
        />

        <SectionHeader title="Analytics" />
        <SettingsRow
          type="toggle"
          label="Share Analytics"
          icon={<ChartBarIcon size={20} color={theme.colors.tertiary} />}
          value={analyticsEnabled}
          onValueChange={setAnalyticsEnabled}
          isFirst
          isLast
        />
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
});
