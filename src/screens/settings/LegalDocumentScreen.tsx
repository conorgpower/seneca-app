import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { DOCUMENTS } from '../../utils/legalContent';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type RouteParams = RouteProp<MainStackParamList, 'LegalDocument'>;

export default function LegalDocumentScreen() {
  const route = useRoute<RouteParams>();
  const { documentKey } = route.params;
  const content = DOCUMENTS[documentKey] || 'Document not found.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {renderMarkdown(content)}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      elements.push(<View key={key++} style={styles.spacer} />);
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <Text key={key++} style={styles.h1}>
          {line.replace(/^# /, '')}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={key++} style={styles.h2}>
          {line.replace(/^## /, '')}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={key++} style={styles.h3}>
          {line.replace(/^### /, '')}
        </Text>,
      );
      continue;
    }

    if (line.match(/^\s*[-*]\s/)) {
      const bulletText = line.replace(/^\s*[-*]\s/, '');
      elements.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={styles.bullet}>{'\u2022'}</Text>
          <Text style={styles.bulletText}>{renderInline(bulletText)}</Text>
        </View>,
      );
      continue;
    }

    if (line.match(/^---+$/)) {
      elements.push(<View key={key++} style={styles.hr} />);
      continue;
    }

    elements.push(
      <Text key={key++} style={styles.paragraph}>
        {renderInline(line)}
      </Text>,
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
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
  spacer: {
    height: 8,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
});
