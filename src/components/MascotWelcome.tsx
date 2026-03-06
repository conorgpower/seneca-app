import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { getSupabaseImageSource } from '../data/asset-cdn';

export interface QuickChip {
  label: string;
  onPress: () => void;
}

interface MascotWelcomeProps {
  chips?: QuickChip[];
}

// Uses the AI-generated animated GIF mascot.
// React Native's Image component supports animated GIFs on both iOS and Android (RN 0.71+).
export default function MascotWelcome({ chips = [] }: MascotWelcomeProps) {
  const mascotSource = getSupabaseImageSource('mascot/writing-animated_nobg.gif');

  return (
    <View style={styles.container}>
      {mascotSource && (
        <Image
          source={mascotSource}
          style={styles.mascot}
          resizeMode="contain"
        />
      )}

      <Text style={styles.greeting}>How can I help you today?</Text>

      {chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={styles.chipsScroll}
        >
          {chips.map((chip, i) => (
            <TouchableOpacity
              key={i}
              onPress={chip.onPress}
              style={styles.chip}
              activeOpacity={0.75}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  mascot: {
    width: 160,
    height: 160,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
  chipsScroll: {
    marginTop: 24,
    flexGrow: 0,
  },
  chipsContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  chip: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
