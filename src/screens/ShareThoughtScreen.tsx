import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { generateReflection, generateAnonymousName } from '../services/reflection-ai.service';
import { submitReflection } from '../services/reflection.service';
import { getUserProfile } from '../services/user-profile.service';
import { buildLightPersonalizationHint } from '../services/profile-context.service';
import { triggerHaptic } from '../hooks/useAppPreferences';

const MAX_CHARACTERS = 200;

export default function ShareThoughtScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const characterCount = inputText.length;
  const isValid = inputText.trim().length > 0 && characterCount <= MAX_CHARACTERS;

  const handleSubmit = async () => {
    if (!isValid || !user) return;

    setIsGenerating(true);

    try {
      let personalizationHint: string | null = null;
      const { profile } = await getUserProfile(user.id);
      personalizationHint = buildLightPersonalizationHint(profile?.onboarding_answers);

      // Step 1: Generate AI reflection
      const { generatedText, error: aiError } = await generateReflection(
        inputText.trim(),
        personalizationHint
      );

      if (aiError || !generatedText) {
        throw aiError || new Error('Failed to generate reflection');
      }

      // Step 2: Submit to database
      const displayName =
        user.user_metadata?.name || generateAnonymousName();

      const { error: submitError } = await submitReflection({
        user_id: user.id,
        display_name: displayName,
        input_text: inputText.trim(),
        generated_text: generatedText,
      });

      if (submitError) {
        throw submitError;
      }

      // Step 3: Success - navigate back
      triggerHaptic('success');
      Alert.alert(
        'Reflection Shared',
        'Your reflection has been added to the queue and will be live soon!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error sharing thought:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to share reflection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: theme.spacing.lg + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>Share Your Thought</Text>
          <Text style={styles.subtitle}>
            What are you thinking or feeling? Keep it brief — we'll turn it into a Stoic reflection.
          </Text>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="e.g., I'm struggling with impatience today..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={MAX_CHARACTERS}
            editable={!isGenerating}
            autoFocus
            textAlignVertical="top"
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={handleSubmit}
          />

          {/* Character Counter */}
          <Text
            style={[
              styles.characterCount,
              characterCount > MAX_CHARACTERS && styles.characterCountError,
            ]}
          >
            {characterCount}/{MAX_CHARACTERS}
          </Text>

          <View style={styles.submitSection}>
            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!isValid || isGenerating) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || isGenerating}
            >
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.colors.background} size="small" />
                  <Text style={styles.submitButtonText}>Crafting your reflection...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Share</Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            {!isGenerating && (
              <Text style={styles.info}>
                Your reflection will join the live queue and be shared with the community soon.
              </Text>
            )}
            {!isGenerating && (
              <Text style={styles.infoHint}>Tip: tap Send on the keyboard to share quickly.</Text>
            )}
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
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  input: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  characterCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  characterCountError: {
    color: '#ef4444',
  },
  submitSection: {
    marginTop: theme.spacing.sm,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  info: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoHint: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
