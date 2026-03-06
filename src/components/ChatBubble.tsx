import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MessageText, IMessage } from 'react-native-gifted-chat';
import { theme } from '../theme';

interface ChatBubbleProps {
  currentMessage: IMessage;
  nextMessage?: IMessage;
  previousMessage?: IMessage;
  position: 'left' | 'right';
  [key: string]: any;
}

/**
 * iMessage-style chat bubble with SVG tail and message grouping.
 *
 * GiftedChat uses an inverted FlatList (newest at bottom). In props:
 *   - nextMessage = the message visually ABOVE (older)
 *   - previousMessage = the message visually BELOW (newer)
 *
 * "Last in group" = bottommost message from a consecutive run of the same
 * sender. That's when previousMessage is absent or from a different user.
 */
export default function ChatBubble({
  currentMessage,
  nextMessage,
  previousMessage,
  position,
}: ChatBubbleProps) {
  const isLeft = position === 'left';

  // ── Grouping logic ──────────────────────────────────────────────────
  const sameUserAsPrevious =
    !!previousMessage &&
    previousMessage.user?._id === currentMessage.user?._id;

  const sameUserAsNext =
    !!nextMessage &&
    nextMessage.user?._id === currentMessage.user?._id;

  // Last in visual group → show the tail
  const isLastInGroup = !sameUserAsPrevious;
  // First in visual group → more top margin
  const isFirstInGroup = !sameUserAsNext;

  // ── Border radii ────────────────────────────────────────────────────
  const RADIUS = 18;
  const GROUPED_RADIUS = 6;

  const borderRadius = useMemo(() => {
    if (isLeft) {
      return {
        borderTopLeftRadius: isFirstInGroup ? RADIUS : GROUPED_RADIUS,
        borderTopRightRadius: RADIUS,
        borderBottomRightRadius: RADIUS,
        borderBottomLeftRadius: isLastInGroup ? 0 : GROUPED_RADIUS,
      };
    }
    return {
      borderTopLeftRadius: RADIUS,
      borderTopRightRadius: isFirstInGroup ? RADIUS : GROUPED_RADIUS,
      borderBottomLeftRadius: RADIUS,
      borderBottomRightRadius: isLastInGroup ? 0 : GROUPED_RADIUS,
    };
  }, [isLeft, isFirstInGroup, isLastInGroup]);

  // ── Colors ──────────────────────────────────────────────────────────
  const bubbleColor = isLeft ? theme.colors.tertiary : theme.colors.primary;
  const textColor = isLeft ? '#1C1B1E' : '#FFFFFF';

  // ── Spacing ─────────────────────────────────────────────────────────
  const marginBottom = isLastInGroup ? 10 : 2;
  const marginTop = isFirstInGroup ? 4 : 0;

  return (
    <View
      style={[
        styles.wrapper,
        {
          alignSelf: isLeft ? 'flex-start' : 'flex-end',
          marginBottom,
          marginTop,
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          borderRadius,
        ]}
      >
        <MessageText
          currentMessage={currentMessage}
          position={position}
          textStyle={{
            left: { color: textColor, fontSize: 16, lineHeight: 22 },
            right: { color: textColor, fontSize: 16, lineHeight: 22 },
          }}
          containerStyle={{
            left: { marginHorizontal: 0, marginVertical: 0 },
            right: { marginHorizontal: 0, marginVertical: 0 },
          }}
          linkStyle={{
            left: { color: isLeft ? '#0066CC' : '#FFFFFF', textDecorationLine: 'underline' },
            right: { color: '#FFFFFF', textDecorationLine: 'underline' },
          }}
        />
      </View>

      {/* SVG tail — only on the last message in a group */}
      {isLastInGroup && (
        <View
          style={[
            styles.tailContainer,
            isLeft ? styles.tailLeft : styles.tailRight,
          ]}
        >
          <Svg width={12} height={16} viewBox="0 0 12 16">
            {isLeft ? (
              <Path
                d="M 12 0 C 12 8 6 14 0 16 L 12 16 Z"
                fill={bubbleColor}
              />
            ) : (
              <Path
                d="M 0 0 C 0 8 6 14 12 16 L 0 16 Z"
                fill={bubbleColor}
              />
            )}
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tailContainer: {
    position: 'absolute',
    bottom: 0,
  },
  tailLeft: {
    left: -1,
  },
  tailRight: {
    right: -1,
  },
});
