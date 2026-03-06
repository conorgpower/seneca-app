import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { generateReflection, generateAnonymousName } from '../services/reflection-ai.service';
import { submitReflection } from '../services/reflection.service';
import { getUserProfile } from '../services/user-profile.service';
import { buildLightPersonalizationHint } from '../services/profile-context.service';
import { triggerHaptic } from '../hooks/useAppPreferences';
import { AppBackground } from '../components/AppBackground';
import { getSupabaseImageSource } from '../data/asset-cdn';
import { useAchievementCheck } from '../hooks/useAchievementCheck';

const MAX_CHARACTERS = 200;

export default function ShareThoughtScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { checkAndNotify } = useAchievementCheck();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const thinkingGif = getSupabaseImageSource('mascot/thinking-animated_nobg.gif');

  const characterCount = inputText.length;
  const isValid = inputText.trim().length > 0 && characterCount <= MAX_CHARACTERS;

  const returnToCommunityMain = () => {
    navigation.goBack();
  };

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

      // Check community achievements in background
      checkAndNotify('community');

      // Step 3: Success - navigate back
      triggerHaptic('success');
      Alert.alert(
        'Reflection Shared',
        'Your reflection has been added to the queue and will be live soon!',
        [
          {
            text: 'OK',
            onPress: returnToCommunityMain,
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
    <AppBackground>
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
            <TouchableOpacity onPress={returnToCommunityMain} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Ionicons name="pencil-outline" size={28} color={theme.colors.primary} style={styles.titleIcon} />
            <Text style={styles.title}>Share Your Thought</Text>
          </View>
          <Text style={styles.subtitle}>
            What are you thinking or feeling? Keep it brief — we'll turn it into a Stoic reflection.
          </Text>

          {/* Mascot Animation */}
          <View style={styles.mascotContainer}>
            {thinkingGif && (
              <Image
                source={thinkingGif}
                style={styles.mascotGif}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Input */}
          <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
          ]}>
            <TextInput
              style={styles.input}
              placeholder="e.g., I'm struggling with impatience today..."
              placeholderTextColor={theme.colors.textTertiary}
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>

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
              activeOpacity={0.8}
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
              <View style={styles.infoContainer}>
                <Text style={styles.info}>
                  Your reflection will join the live queue and be shared with the community soon.
                </Text>
                <Text style={styles.infoHint}>Tip: tap Send on the keyboard to share quickly.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: 2,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleIcon: {
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  mascotGif: {
    width: 190,
    height: 190,
  },
  inputContainer: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primaryDark,
  },
  input: {
    padding: theme.spacing.lg,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    minHeight: 140,
  },
  characterCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  characterCountError: {
    color: theme.colors.error,
  },
  submitSection: {
    marginTop: theme.spacing.sm,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
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
  infoContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
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
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
