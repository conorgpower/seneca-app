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
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { TERMS, PRIVACY } from '../utils/legalContent';
import { getSupabaseImageSource } from '../data/asset-cdn';

interface CreateAccountScreenProps {
  onCreateAccount: (email: string, password: string, name: string) => Promise<void>;
  onSocialAuth: (provider: 'apple' | 'google') => Promise<void>;
  onBack: () => void;
  title?: string;
  subtitle?: string;
  overallProgress?: number;
}

export default function CreateAccountScreen({
  onCreateAccount,
  onSocialAuth,
  onBack,
  title = 'Create your account',
  subtitle = "You're almost there! Just a few details to get started",
  overallProgress,
}: CreateAccountScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<{ visible: boolean; title: string; content: string }>({
    visible: false,
    title: '',
    content: '',
  });
  const appleLogo = getSupabaseImageSource('images/logos/apple-white.webp');
  const googleLogo = getSupabaseImageSource('images/logos/google.webp');

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password: string) => {
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

  const handleCreateAccount = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Validation
    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Invalid Password', passwordValidation.message);
      return;
    }

    setLoading(true);
    try {
      await onCreateAccount(trimmedEmail, password, trimmedName);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = (pwd: string) => {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const canSubmit =
    name.trim().length >= 2 && validateEmail(email) && isPasswordValid(password) && !loading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Progress Bar */}
            {overallProgress !== undefined && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Social Auth Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => onSocialAuth('apple')}
                disabled={loading}
              >
                {appleLogo ? <Image source={appleLogo} style={styles.socialIconImage} /> : null}
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => onSocialAuth('google')}
                disabled={loading}
              >
                {googleLogo ? <Image source={googleLogo} style={styles.socialIconImage} /> : null}
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              You're almost there! Just a few details to get started
            </Text>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateAccount}
                />

                {/* Password Requirements */}
                {password.length > 0 && (
                  <View style={styles.passwordRequirements}>
                    <PasswordRequirement
                      met={password.length >= 8}
                      text="At least 8 characters"
                    />
                    <PasswordRequirement met={/[A-Z]/.test(password)} text="One uppercase letter" />
                    <PasswordRequirement met={/[a-z]/.test(password)} text="One lowercase letter" />
                    <PasswordRequirement met={/[0-9]/.test(password)} text="One number" />
                  </View>
                )}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={[styles.createButton, !canSubmit && styles.createButtonDisabled]}
                onPress={handleCreateAccount}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {/* Terms */}
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setLegalModal({ visible: true, title: 'Terms of Service', content: TERMS })}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setLegalModal({ visible: true, title: 'Privacy Policy', content: PRIVACY })}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Document Modal */}
      <Modal
        visible={legalModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
              style={styles.modalBackButton}
            >
              <Text style={styles.modalBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{legalModal.title}</Text>
            <View style={styles.modalBackButton} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
          >
            {renderMarkdown(legalModal.content)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700', color: theme.colors.text }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      elements.push(<View key={key++} style={{ height: 8 }} />);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <Text key={key++} style={styles.mdH1}>{line.replace(/^# /, '')}</Text>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={key++} style={styles.mdH2}>{line.replace(/^## /, '')}</Text>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={key++} style={styles.mdH3}>{line.replace(/^### /, '')}</Text>,
      );
      continue;
    }
    if (line.match(/^\s*[-*]\s/)) {
      const bulletText = line.replace(/^\s*[-*]\s/, '');
      elements.push(
        <View key={key++} style={styles.mdBulletRow}>
          <Text style={styles.mdBullet}>{'\u2022'}</Text>
          <Text style={styles.mdBulletText}>{renderInline(bulletText)}</Text>
        </View>,
      );
      continue;
    }
    if (line.match(/^---+$/)) {
      elements.push(<View key={key++} style={styles.mdHr} />);
      continue;
    }
    elements.push(
      <Text key={key++} style={styles.mdParagraph}>{renderInline(line)}</Text>,
    );
  }

  return elements;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  return (
    <View style={styles.requirement}>
      <Text style={[styles.requirementIcon, met && styles.requirementIconMet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{text}</Text>
    </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  socialContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
    fontWeight: '600',
  },
  socialIconImage: {
    width: 20,
    height: 20,
    marginRight: theme.spacing.sm,
    resizeMode: 'contain',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
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
    fontSize: 13,
    color: theme.colors.textTertiary,
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl * 1.5,
    lineHeight: 24,
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputContainer: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  passwordRequirements: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  requirementIcon: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  requirementIconMet: {
    color: theme.colors.primary,
  },
  requirementText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  requirementTextMet: {
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.border,
    shadowOpacity: 0,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Legal Document Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalBackButton: {
    width: 70,
  },
  modalBackText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Markdown styles
  mdH1: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  mdH2: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  mdH3: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  mdParagraph: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  mdBulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  mdBullet: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginRight: 8,
    lineHeight: 24,
  },
  mdBulletText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    flex: 1,
  },
  mdHr: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
});
