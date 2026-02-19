import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
}

export default function SignupScreen({ onNavigateToLogin }: SignupScreenProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password: string) => {
    // At least 8 characters, one uppercase, one lowercase, one number
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: '' };
  };

  const handleSignup = async () => {
    // Trim inputs
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Validation
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error, session } = await signUp(trimmedEmail, password, { name: trimmedName });
      
      if (error) {
        Alert.alert('Signup Failed', error.message);
      }
      // Auth context will handle navigation on successful signup
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
          <Text style={styles.title}>Begin Your Journey</Text>
          <Text style={styles.subtitle}>
            Join thousands seeking wisdom from the great philosophers
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={theme.colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {password.length > 0 && (
            <View style={styles.passwordHints}>
              <Text style={[styles.passwordHint, password.length >= 8 && styles.passwordHintValid]}>
                ✓ At least 8 characters
              </Text>
              <Text style={[styles.passwordHint, /[A-Z]/.test(password) && styles.passwordHintValid]}>
                ✓ One uppercase letter
              </Text>
              <Text style={[styles.passwordHint, /[a-z]/.test(password) && styles.passwordHintValid]}>
                ✓ One lowercase letter
              </Text>
              <Text style={[styles.passwordHint, /[0-9]/.test(password) && styles.passwordHintValid]}>
                ✓ One number
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={theme.colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.terms}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onNavigateToLogin}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passwordHints: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  passwordHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  passwordHintValid: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  button: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  secondaryButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  terms: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  termsText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: theme.colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sizes.sm,
  },
});
