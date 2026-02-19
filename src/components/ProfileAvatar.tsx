import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface ProfileAvatarProps {
  name: string;
  onPress: () => void;
}

export default function ProfileAvatar({ name, onPress }: ProfileAvatarProps) {
  const getInitial = (fullName: string) => {
    if (!fullName || typeof fullName !== 'string') return 'U';
    const initial = fullName.charAt(0).toUpperCase();
    return initial || 'U';
  };

  const initial = getInitial(name);

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{initial}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5A54B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
