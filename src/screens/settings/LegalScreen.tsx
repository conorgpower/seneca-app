import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import SettingsRow, { SectionHeader } from '../../components/SettingsRow';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function LegalScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Documents" />
        <SettingsRow
          type="navigate"
          label="Terms of Service"
          icon="📄"
          onPress={() =>
            navigation.navigate('LegalDocument', {
              documentKey: 'terms',
              title: 'Terms of Service',
            })
          }
          isFirst
        />
        <SettingsRow
          type="navigate"
          label="Privacy Policy"
          icon="🔒"
          onPress={() =>
            navigation.navigate('LegalDocument', {
              documentKey: 'privacy',
              title: 'Privacy Policy',
            })
          }
          isLast
        />

        <SectionHeader title="Public Domain Notice" />
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Certain public domain texts available in this app were sourced from
            public repositories including Project Gutenberg
            (www.gutenberg.org). These works are in the public domain and are
            made freely available for personal use and reflection.
          </Text>
        </View>

        <SectionHeader title="About Seneca Chat" />
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Seneca Chat</Text>
          <Text style={styles.aboutText}>
            Seneca Chat is a daily philosophy companion designed to help you
            build a wiser, more reflective life through the timeless wisdom of
            Stoic philosophy and the great thinkers.
          </Text>
          <Text style={styles.aboutCopyright}>
            {'\u00A9'} {new Date().getFullYear()} Seneca Chat. All rights reserved.
          </Text>
        </View>
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
  noticeCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  aboutCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  aboutCopyright: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});
