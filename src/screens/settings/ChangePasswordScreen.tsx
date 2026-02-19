import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { updatePassword } from '../../services/auth.service';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to update password.');
      } else {
        Alert.alert('Success', 'Your password has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          Enter your new password below. It must be at least 8 characters long.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter new password"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
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
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
