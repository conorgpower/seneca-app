import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as StoreReview from 'expo-store-review';
import { theme } from '../../theme';
import { getSupabaseImageSource } from '../../data/asset-cdn';

interface SocialProofScreenProps {
  onComplete: () => void;
  overallProgress?: number;
  onBack?: () => void;
}

const TESTIMONIALS = [
  {
    text: 'This replaced my journaling habit entirely. The AI understands Stoicism better than any book.',
    author: 'Alex M.',
    role: 'Founder',
  },
  {
    text: "I finally feel like I'm making real progress on my mental health. Not just reading, but practicing.",
    author: 'Sarah K.',
    role: 'Designer',
  },
  {
    text: 'Five years of therapy condensed into daily 10-minute reflections. Game changer.',
    author: 'David R.',
    role: 'Engineer',
  },
];

const userImages = {
  user1: getSupabaseImageSource('images/social-proof/user1.webp'),
  user2: getSupabaseImageSource('images/social-proof/user2.webp'),
  user3: getSupabaseImageSource('images/social-proof/user3.webp'),
  user4: getSupabaseImageSource('images/social-proof/user4.webp'),
  user5: getSupabaseImageSource('images/social-proof/user5.webp'),
  user6: getSupabaseImageSource('images/social-proof/user6.webp'),
};

export default function SocialProofScreen({ onComplete, overallProgress, onBack }: SocialProofScreenProps) {
  useEffect(() => {
    let isActive = true;

    const promptForRating = async () => {
      try {
        const available = await StoreReview.isAvailableAsync();
        if (!isActive || !available) return;
        await StoreReview.requestReview();
      } catch {
        // Best-effort prompt only; ignore failures in onboarding flow.
      }
    };

    promptForRating();

    return () => {
      isActive = false;
    };
  }, []);

  const renderUserImage = (source: ReturnType<typeof getSupabaseImageSource>, style: any) => {
    if (source) return <Image source={source} style={style} />;

    return (
      <View style={[style, styles.placeholderAvatar]}>
        <Text style={styles.placeholderAvatarText}>👤</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}

          {overallProgress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
              </View>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star, index) => (
                <Text key={star} style={styles.star}>
                  {index < 4 ? '⭐' : '⭐'}
                </Text>
              ))}
            </View>
            <Text style={styles.rating}>4.8 average rating</Text>
            <Text style={styles.users}>Many enlightened users</Text>

            {/* User Images */}
            <View style={styles.userImagesContainer}>
              {renderUserImage(userImages.user1, styles.userImagePlaceholder)}
              {renderUserImage(userImages.user2, [styles.userImagePlaceholder, { marginLeft: -12 }])}
              {renderUserImage(userImages.user3, [styles.userImagePlaceholder, { marginLeft: -12 }])}
            </View>
            <Text style={styles.userCount}>Seneca Chat Users</Text>
          </View>

          <View style={styles.testimonialsContainer}>
            {TESTIMONIALS.map((testimonial, index) => (
              <View key={index} style={styles.testimonial}>
                <View style={styles.testimonialHeader}>
                  {renderUserImage(
                    index === 0 ? userImages.user4 : index === 1 ? userImages.user5 : userImages.user6,
                    styles.testimonialImagePlaceholder
                  )}
                  <View style={styles.testimonialAuthorHeader}>
                    <Text style={styles.authorName}>{testimonial.author}</Text>
                    <View style={styles.starsSmall}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.starSmall}>⭐</Text>
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Start your journey to clarity</Text>
            <Text style={styles.disclaimer}>Based on early user feedback</Text>
          </View>
        </ScrollView>
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 2,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  star: {
    fontSize: 28,
    marginHorizontal: 2,
  },
  rating: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  users: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  userImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  userImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  placeholderText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholderAvatar: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderAvatarText: {
    fontSize: 16,
  },
  userCount: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  testimonialsContainer: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  testimonial: {
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  testimonialImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testimonialAuthorHeader: {
    flex: 1,
  },
  starsSmall: {
    flexDirection: 'row',
    marginTop: 4,
  },
  starSmall: {
    fontSize: 12,
    marginRight: 2,
  },
  testimonialText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  authorRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingTop: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
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
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
