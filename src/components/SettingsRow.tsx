import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { theme } from '../theme';

interface BaseProps {
  label: string;
  icon?: string;
  iconImage?: ImageSourcePropType;
  isFirst?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
}

interface NavigateRowProps extends BaseProps {
  type: 'navigate';
  onPress: () => void;
  subtitle?: string;
}

interface ToggleRowProps extends BaseProps {
  type: 'toggle';
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

interface ValueRowProps extends BaseProps {
  type: 'value';
  value: string;
  onPress: () => void;
}

interface DestructiveRowProps extends BaseProps {
  type: 'destructive';
  onPress: () => void;
}

interface LinkRowProps extends BaseProps {
  type: 'link';
  onPress: () => void;
  subtitle?: string;
}

type SettingsRowProps =
  | NavigateRowProps
  | ToggleRowProps
  | ValueRowProps
  | DestructiveRowProps
  | LinkRowProps;

export default function SettingsRow(props: SettingsRowProps) {
  const { label, icon, iconImage, isFirst, isLast, style } = props;

  const borderStyle: ViewStyle = {
    borderTopLeftRadius: isFirst ? 12 : 0,
    borderTopRightRadius: isFirst ? 12 : 0,
    borderBottomLeftRadius: isLast ? 12 : 0,
    borderBottomRightRadius: isLast ? 12 : 0,
    borderBottomWidth: isLast ? 1 : 0,
  };

  const isDestructive = props.type === 'destructive';

  const renderRight = () => {
    switch (props.type) {
      case 'toggle':
        return (
          <Switch
            value={props.value}
            onValueChange={props.onValueChange}
            trackColor={{ false: '#555', true: theme.colors.primary }}
            thumbColor="#FFFFFF"
            disabled={props.disabled}
          />
        );
      case 'value':
        return (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{props.value}</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        );
      case 'navigate':
      case 'link':
        return <Text style={styles.arrow}>›</Text>;
      case 'destructive':
        return <Text style={[styles.arrow, styles.destructiveText]}>›</Text>;
      default:
        return null;
    }
  };

  const content = (
    <View style={[styles.row, borderStyle, style]}>
      <View style={styles.left}>
        {iconImage ? (
          <Image source={iconImage} style={styles.iconImage} resizeMode="contain" />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : null}
        <View style={styles.labelContainer}>
          <Text style={[styles.label, isDestructive && styles.destructiveText]}>
            {label}
          </Text>
          {(props.type === 'navigate' || props.type === 'link') && props.subtitle && (
            <Text style={styles.subtitle}>{props.subtitle}</Text>
          )}
        </View>
      </View>
      {renderRight()}
    </View>
  );

  if (props.type === 'toggle') {
    return content;
  }

  return (
    <TouchableOpacity
      onPress={'onPress' in props ? props.onPress : undefined}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    minHeight: 52,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: theme.colors.textTertiary,
    fontWeight: '300',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  destructiveText: {
    color: '#FF4444',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
