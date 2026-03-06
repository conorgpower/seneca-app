import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  onPress: () => void;
}

export default function ProfileAvatar({ name, avatarUrl, size = 44, onPress }: ProfileAvatarProps) {
  const getInitial = (fullName: string) => {
    if (!fullName || typeof fullName !== 'string') return 'U';
    const initial = fullName.charAt(0).toUpperCase();
    return initial || 'U';
  };

  const initial = getInitial(name);
  const borderRadius = size / 2;
  const fontSize = size * 0.55;

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { width: size, height: size, borderRadius }]}
        />
      ) : (
        <View style={[styles.avatar, styles.initialsAvatar, { width: size, height: size, borderRadius }]}>
          <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  avatar: {
    overflow: 'hidden',
  },
  initialsAvatar: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
