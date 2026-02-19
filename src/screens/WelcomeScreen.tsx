import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Phone Mockup Section */}
        <View style={styles.mockupContainer}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneNotch} />
            <View style={styles.phoneContent}>
              {/* Mock app content showing a chat screen */}
              <View style={styles.mockHeader}>
                <Text style={styles.mockHeaderText}>Daily Wisdom</Text>
              </View>
              <View style={styles.mockChatBubble}>
                <Text style={styles.mockChatText}>
                  "We suffer more often in imagination than in reality."
                </Text>
                <Text style={styles.mockChatAuthor}>— Seneca</Text>
              </View>
              <View style={[styles.mockChatBubble, styles.mockChatBubbleUser]}>
                <Text style={styles.mockChatTextUser}>
                  What does this mean for my daily life?
                </Text>
              </View>
              <View style={styles.mockChatBubble}>
                <Text style={styles.mockChatText}>
                  It reminds us that much of our suffering comes from worrying about
                  things that haven't happened...
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title}>Ancient wisdom for modern life</Text>
          <Text style={styles.subtitle}>
            Learn from history's greatest philosophers through personalized daily guidance
          </Text>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={onGetStarted}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: theme.spacing.xl,
  },
  mockupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  phoneFrame: {
    width: width * 0.65,
    height: height * 0.45,
    backgroundColor: '#1a1a1a',
    borderRadius: 35,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  phoneNotch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 25,
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 1,
  },
  phoneContent: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 31,
    overflow: 'hidden',
    padding: theme.spacing.md,
  },
  mockHeader: {
    paddingVertical: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  mockHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  mockChatBubble: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: 16,
    marginBottom: theme.spacing.sm,
    maxWidth: '85%',
  },
  mockChatBubbleUser: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
  },
  mockChatText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  mockChatTextUser: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  mockChatAuthor: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  content: {
    paddingVertical: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaSection: {
    paddingBottom: theme.spacing.xl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  signInLink: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
