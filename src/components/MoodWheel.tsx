import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { theme } from '../theme';

type HeroIcon = React.ComponentType<{ color?: string; size?: number }>;

interface MoodWheelProps {
  options: Array<{ value: string; label: string; icon?: HeroIcon }>;
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 8;
const ICON_DISTANCE = RADIUS * 0.55;
const STROKE_W = 2;
const SELECTED_STROKE_W = 6;

// Segment centers at cardinal directions (top, right, bottom, left)
const SEGMENT_CENTERS_DEG = [-90, 0, 90, 180];
// Boundary angles between segments
const BOUNDARY_ANGLES = [-135, -45, 45, 135];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Full pie segment (no gap) */
function pieSegmentPath(startDeg: number, endDeg: number): string {
  const x1 = CENTER + RADIUS * Math.cos(toRad(startDeg));
  const y1 = CENTER + RADIUS * Math.sin(toRad(startDeg));
  const x2 = CENTER + RADIUS * Math.cos(toRad(endDeg));
  const y2 = CENTER + RADIUS * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/** Outer arc stroke path (no center connection) */
function arcStrokePath(startDeg: number, endDeg: number): string {
  const x1 = CENTER + RADIUS * Math.cos(toRad(startDeg));
  const y1 = CENTER + RADIUS * Math.sin(toRad(startDeg));
  const x2 = CENTER + RADIUS * Math.cos(toRad(endDeg));
  const y2 = CENTER + RADIUS * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function MoodWheel({ options, selectedValue, onSelect }: MoodWheelProps) {
  const segmentAngle = 360 / options.length;

  const selectedIndex = selectedValue
    ? options.findIndex((o) => o.value === selectedValue)
    : -1;

  const segments = options.map((option, i) => {
    const centerDeg = SEGMENT_CENTERS_DEG[i] ?? i * segmentAngle - 90;
    const startDeg = centerDeg - segmentAngle / 2;
    const endDeg = centerDeg + segmentAngle / 2;
    const isSelected = selectedValue === option.value;

    const iconX = CENTER + ICON_DISTANCE * Math.cos(toRad(centerDeg));
    const iconY = CENTER + ICON_DISTANCE * Math.sin(toRad(centerDeg));

    return { ...option, startDeg, endDeg, iconX, iconY, isSelected };
  });

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Filled segments (no gaps) */}
        {segments.map((seg) => (
          <Path
            key={seg.value}
            d={pieSegmentPath(seg.startDeg, seg.endDeg)}
            fill={seg.isSelected ? theme.colors.quaternary : theme.colors.backgroundCard}
            onPress={() => onSelect(seg.value)}
          />
        ))}

        {/* Unselected: thin white outer arcs */}
        {segments.map((seg, i) => i !== selectedIndex && (
          <Path
            key={`arc-${seg.value}`}
            d={arcStrokePath(seg.startDeg, seg.endDeg)}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={STROKE_W}
          />
        ))}

        {/* Unselected: thin white divider lines */}
        {BOUNDARY_ANGLES.map((angle, j) => {
          const isPrimary =
            selectedIndex >= 0 &&
            (j === selectedIndex || j === (selectedIndex + 1) % options.length);
          if (isPrimary) return null;
          const x = CENTER + RADIUS * Math.cos(toRad(angle));
          const y = CENTER + RADIUS * Math.sin(toRad(angle));
          return (
            <Line
              key={`div-${angle}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#FFFFFF"
              strokeWidth={STROKE_W}
            />
          );
        })}

        {/* Selected segment: single combined outline path with rounded joins */}
        {selectedIndex >= 0 && (
          <Path
            d={pieSegmentPath(segments[selectedIndex].startDeg, segments[selectedIndex].endDeg)}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={SELECTED_STROKE_W}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Center circle */}
        <Circle cx={CENTER} cy={CENTER} r={18} fill={theme.colors.background} />
      </Svg>

      {/* Icon + label overlays (non-interactive, SVG handles touch) */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
        {segments.map((seg) => {
          const IconComponent = seg.icon;
          return (
            <View
              key={seg.value}
              style={[styles.segmentContent, {
                left: seg.iconX - 40,
                top: seg.iconY - 28,
              }]}
            >
              {IconComponent && (
                <IconComponent
                  color={seg.isSelected ? '#000000' : theme.colors.quaternary}
                  size={24}
                />
              )}
              <Text style={[
                styles.segmentLabel,
                seg.isSelected && styles.segmentLabelSelected,
              ]}>
                {seg.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  overlay: {},
  segmentContent: {
    position: 'absolute',
    width: 80,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: '#000000',
  },
});
