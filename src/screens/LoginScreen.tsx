import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as AuthService from '../services/auth.service';
import { theme } from '../theme';
import { getSupabaseImageSource } from '../data/asset-cdn';

interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onSocialAuth: (provider: 'apple' | 'google') => Promise<void>;
  showBackButton?: boolean;
}

export default function LoginScreen({
  onNavigateToSignup,
  onSocialAuth,
  showBackButton = false,
}: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const appleLogo = getSupabaseImageSource('images/logos/apple-white.webp');
  const googleLogo = getSupabaseImageSource('images/logos/google.webp');

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(trimmedEmail, trimmedPassword);
      
      if (error) {
        Alert.alert('Login Failed', error.message);
      }
      // Success - auth context will automatically update and navigate to app
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address and we\'ll send you a link to reset your password.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Link',
          onPress: async (resetEmail?: string) => {
            if (!resetEmail) {
              Alert.alert('Error', 'Please enter your email address');
              return;
            }

            const trimmedResetEmail = resetEmail.trim();
            if (!validateEmail(trimmedResetEmail)) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }

            try {
              const { error } = await AuthService.resetPassword(trimmedResetEmail);
              
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert(
                  'Check Your Email',
                  'We\'ve sent you a password reset link. Please check your email and follow the instructions.'
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to send reset email. Please try again.');
            }
          },
        },
      ],
      'plain-text',
      email // Pre-fill with current email if available
    );
  };

  const handleSocialSignIn = async (provider: 'apple' | 'google') => {
    setLoading(true);
    try {
      await onSocialAuth(provider);
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
        {showBackButton && (
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={onNavigateToSignup}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Continue your philosophical journey
            </Text>
          </View>

          <View style={styles.divider}>
            <TouchableOpacity
              style={[styles.button, styles.socialButton]}
              onPress={() => handleSocialSignIn('apple')}
              disabled={loading}
            >
              {appleLogo ? <Image source={appleLogo} style={styles.socialIconImage} /> : null}
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.socialButton]}
              onPress={() => handleSocialSignIn('google')}
              disabled={loading}
            >
              {googleLogo ? <Image source={googleLogo} style={styles.socialIconImage} /> : null}
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
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

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onNavigateToSignup}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
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
  headerContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
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
  divider: {
    marginBottom: theme.spacing.lg,
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
  socialButton: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIconImage: {
    width: 20,
    height: 20,
    marginRight: theme.spacing.sm,
    resizeMode: 'contain',
  },
  socialButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
