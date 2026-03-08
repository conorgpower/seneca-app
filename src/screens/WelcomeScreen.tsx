import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Image,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { theme } from '../theme';
import { getSupabaseImageSource } from '../data/asset-cdn';
import { TERMS, PRIVACY } from '../utils/legalContent';
import * as Haptics from 'expo-haptics';
import { AppBackground } from '../components/AppBackground';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSocialAuth: (provider: 'apple' | 'google') => Promise<void>;
  onContinueWithEmail: () => void;
}

export default function WelcomeScreen({
  onGetStarted,
  onSocialAuth,
  onContinueWithEmail,
}: WelcomeScreenProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<{ visible: boolean; title: string; content: string }>({
    visible: false,
    title: '',
    content: '',
  });
  const videoRef = useRef<Video>(null);

  const appleLogo = getSupabaseImageSource('images/logos/apple-white.webp');
  const googleLogo = getSupabaseImageSource('images/logos/google.webp');

  const handleSocialSignIn = async (provider: 'apple' | 'google') => {
    setLoading(true);
    try {
      await onSocialAuth(provider);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithEmail = () => {
    setShowSignIn(false);
    onContinueWithEmail();
  };

  return (
    <AppBackground topSafeZone={0}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Video Demo Section */}
        <View style={styles.videoContainer}>
          <View style={styles.phoneFrame}>
            <Video
              ref={videoRef}
              source={require('../../assets/video/widget-demo.mov')}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Ancient Wisdom{'\n'}Made Easy</Text>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onGetStarted();
          }}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowSignIn(true);
            }}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sign In Bottom Sheet */}
      <Modal
        visible={showSignIn}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignIn(false)}
      >
        <View style={styles.overlay}>
          {/* Backdrop — only this area dismisses */}
          <Pressable style={styles.backdrop} onPress={() => setShowSignIn(false)} />

          {/* Sheet content — regular View so child touches work */}
          <View style={styles.bottomSheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sign In</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSignIn(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetDivider} />

            {/* Auth Buttons */}
            <View style={styles.sheetContent}>
              <TouchableOpacity
                style={styles.appleButton}
                onPress={() => handleSocialSignIn('apple')}
                disabled={loading}
              >
                {appleLogo && (
                  <Image source={appleLogo} style={styles.socialIcon} />
                )}
                <Text style={styles.appleButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlinedButton}
                onPress={() => handleSocialSignIn('google')}
                disabled={loading}
              >
                {googleLogo && (
                  <Image source={googleLogo} style={styles.socialIcon} />
                )}
                <Text style={styles.outlinedButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlinedButton}
                onPress={handleContinueWithEmail}
                disabled={loading}
              >
                <Text style={styles.emailIcon}>✉</Text>
                <Text style={styles.outlinedButtonText}>Continue with email</Text>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={styles.loader}
                />
              )}
            </View>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By continuing you agree to Seneca's </Text>
              <TouchableOpacity
                onPress={() => setLegalModal({ visible: true, title: 'Terms of Service', content: TERMS })}
              >
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> and </Text>
              <TouchableOpacity
                onPress={() => setLegalModal({ visible: true, title: 'Privacy Policy', content: PRIVACY })}
              >
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            {/* Legal Document Modal — nested inside sign-in modal so it layers on top */}
            <Modal
              visible={legalModal.visible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
            >
              <SafeAreaView style={styles.legalModalSafeArea}>
                <View style={styles.legalModalHeader}>
                  <TouchableOpacity
                    onPress={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
                    style={styles.legalModalBackButton}
                  >
                    <Text style={styles.legalModalBackText}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.legalModalTitle}>{legalModal.title}</Text>
                  <View style={styles.legalModalBackButton} />
                </View>
                <ScrollView
                  style={styles.legalModalScrollView}
                  contentContainerStyle={styles.legalModalScrollContent}
                  showsVerticalScrollIndicator
                >
                  {renderMarkdown(legalModal.content)}
                </ScrollView>
              </SafeAreaView>
            </Modal>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </AppBackground>
  );
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
        <Text key={key++} style={legalStyles.mdH1}>{line.replace(/^# /, '')}</Text>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={key++} style={legalStyles.mdH2}>{line.replace(/^## /, '')}</Text>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={key++} style={legalStyles.mdH3}>{line.replace(/^### /, '')}</Text>,
      );
      continue;
    }
    if (line.match(/^\s*[-*]\s/)) {
      const bulletText = line.replace(/^\s*[-*]\s/, '');
      elements.push(
        <View key={key++} style={legalStyles.mdBulletRow}>
          <Text style={legalStyles.mdBullet}>{'\u2022'}</Text>
          <Text style={legalStyles.mdBulletText}>{renderInline(bulletText)}</Text>
        </View>,
      );
      continue;
    }
    if (line.match(/^---+$/)) {
      elements.push(<View key={key++} style={legalStyles.mdHr} />);
      continue;
    }
    elements.push(
      <Text key={key++} style={legalStyles.mdParagraph}>{renderInline(line)}</Text>,
    );
  }

  return elements;
}

const legalStyles = StyleSheet.create({
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },

  // Video section
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  phoneFrame: {
    width: width * 0.78,
    height: height * 0.55,
    borderRadius: 35,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },

  // Heading
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 42,
  },

  // CTA
  ctaSection: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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

  // Bottom Sheet Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },

  // Bottom Sheet
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  // Apple button (black)
  appleButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  // Outlined buttons (Google, Email)
  outlinedButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  outlinedButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },

  // Social icons
  socialIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
    resizeMode: 'contain',
  },
  emailIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  loader: {
    marginTop: 8,
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  termsText: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 13,
    textDecorationLine: 'underline',
    color: '#666666',
    lineHeight: 18,
  },

  // Legal Modal
  legalModalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  legalModalBackButton: {
    width: 70,
  },
  legalModalBackText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  legalModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  legalModalScrollView: {
    flex: 1,
  },
  legalModalScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
