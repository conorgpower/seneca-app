import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is Seneca Chat?',
    answer:
      'Seneca Chat is your daily philosophy companion. Think of it as a wise friend who\'s read all the Stoic classics so you don\'t have to (though you should — they\'re great). We serve you daily passages, reflections, and a space to grow alongside a thoughtful community.',
  },
  {
    question: 'Is this app trying to replace my therapist?',
    answer:
      'Absolutely not. Seneca Chat is for philosophical reflection and personal growth — not clinical advice. If you\'re going through something serious, please reach out to a qualified professional. We\'re here for wisdom, not diagnoses.',
  },
  {
    question: 'How does the daily check-in work?',
    answer:
      'Each day you\'ll get a short philosophical passage to reflect on. After reading, you can journal your thoughts, share a reflection with the community, and build your streak. It takes just a few minutes — less time than scrolling social media, and far more rewarding.',
  },
  {
    question: 'What\'s the streak all about?',
    answer:
      'Your streak tracks how many consecutive days you\'ve completed your daily practice. It\'s a gentle nudge to stay consistent. Miss a day? No judgement — Seneca himself probably had off days too.',
  },
  {
    question: 'Can other people see my reflections?',
    answer:
      'Only if you choose to share them with the community. Your private journal entries stay private. When you do share, it\'s anonymous by default — your fellow philosophers see the wisdom, not the author.',
  },
  {
    question: 'How does the AI chat work?',
    answer:
      'You can have philosophical conversations with our AI companion, trained on Stoic and classical philosophy. It\'s great for exploring ideas, getting a different perspective, or just having a thoughtful chat when your friends\' eyes glaze over at the mention of Epictetus.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Yes. We take privacy seriously. Your reflections and conversations are stored securely, and we don\'t sell your data. Check our Privacy Policy in the Legal section for the full details.',
  },
  {
    question: 'How do I change my notification settings?',
    answer:
      'Head to Settings → Notifications. You can toggle daily reminders, streak reminders, and community updates on or off. You can also pick what time you\'d like to be reminded — we recommend whenever you usually reach for your phone out of boredom.',
  },
  {
    question: 'The app feels slow / something looks broken',
    answer:
      'Try closing and reopening the app first. If the issue persists, go to Safety & Support → Report a Problem and let us know what happened. Include as much detail as you can — we read every report.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Settings → Privacy & Data → Delete My Account. We\'ll ask you to confirm, because this is permanent. Once deleted, your data is gone — even Stoic acceptance can\'t bring it back.',
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqRow}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.questionRow}>
        <Text style={styles.questionText}>{item.question}</Text>
        <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </View>
      {expanded && (
        <Text style={styles.answerText}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpFAQScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Got questions? We've probably got answers. If not, hit us up via
          Safety & Support.
        </Text>

        {FAQ_ITEMS.map((item, index) => (
          <FAQRow key={index} item={item} />
        ))}
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
  introText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  faqRow: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 10,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  answerText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 12,
  },
});
