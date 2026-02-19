import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RevenueCatUI from 'react-native-purchases-ui';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import * as RevenueCatService from '../../services/revenuecat.service';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import { getSupabaseImageSource } from '../../data/asset-cdn';

export default function AccountSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, refreshSession } = useAuth();

  const userName = user?.user_metadata?.name || 'User';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [saving, setSaving] = useState(false);
  const appleLogo = getSupabaseImageSource('images/logos/apple-white.webp');
  const googleLogo = getSupabaseImageSource('images/logos/google.webp');

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    if (trimmed === userName) {
      setEditNameVisible(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmed },
      });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to update name.');
      } else {
        await refreshSession();
        setEditNameVisible(false);
        Alert.alert('Success', 'Your name has been updated.');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleManageSubscription = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
      console.error('Error presenting Customer Center:', error);
      // Fallback to platform subscription management
      if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const customerInfo = await RevenueCatService.restorePurchases();
      const hasPro = RevenueCatService.hasProEntitlement(customerInfo);
      if (hasPro) {
        Alert.alert('Restored', 'Your purchases have been restored successfully.');
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
        </View>

        <SectionHeader title="Profile" />
        <SettingsRow
          type="value"
          label="Name"
          icon="👤"
          value={userName}
          onPress={() => {
            setNewName(userName);
            setEditNameVisible(true);
          }}
          isFirst
          isLast
        />

        <SectionHeader title="Security" />
        <SettingsRow
          type="navigate"
          label="Change Password"
          icon="🔑"
          onPress={() => navigation.navigate('ChangePassword')}
          isFirst
          isLast
        />

        <SectionHeader title="Connected Accounts" />
        <SettingsRow
          type="navigate"
          label="Apple"
          iconImage={appleLogo ?? undefined}
          subtitle="Coming Soon"
          onPress={() => {}}
          isFirst
        />
        <SettingsRow
          type="navigate"
          label="Google"
          iconImage={googleLogo ?? undefined}
          subtitle="Coming Soon"
          onPress={() => {}}
          isLast
        />

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Subscription - deliberately de-emphasized */}
        <View style={styles.subscriptionSection}>
          <TouchableOpacity onPress={handleManageSubscription}>
            <Text style={styles.subscriptionLink}>Manage Subscription</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestorePurchases}>
            <Text style={styles.subscriptionLink}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditNameVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCenter}
          >
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setEditNameVisible(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSave, saving && { opacity: 0.6 }]}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonSaveText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5A54B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  signOutButton: {
    marginTop: 32,
    padding: 16,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
  subscriptionSection: {
    marginTop: 32,
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  subscriptionLink: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  // Edit Name Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  modalButtonSave: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
