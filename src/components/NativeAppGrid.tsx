import React from 'react';
import {
  requireNativeComponent,
  Platform,
  UIManager,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface NativeAppGridProps {
  isLocked: boolean;
  refreshTrigger: number;
  style?: StyleProp<ViewStyle>;
}

const hasNativeGrid =
  Platform.OS === 'ios' &&
  UIManager.getViewManagerConfig?.('FocusLockAppGrid') != null;

const NativeGridView = hasNativeGrid
  ? requireNativeComponent<NativeAppGridProps>('FocusLockAppGrid')
  : null;

export default function NativeAppGrid({ isLocked, refreshTrigger, style }: NativeAppGridProps) {
  if (!NativeGridView) return null;
  return <NativeGridView isLocked={isLocked} refreshTrigger={refreshTrigger} style={style} />;
}
