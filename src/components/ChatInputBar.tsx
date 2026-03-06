import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  UIManager,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Device from 'expo-device';
import { theme } from '../theme';
import { triggerHaptic } from '../hooks/useAppPreferences';

// Enable LayoutAnimation on Android (used by conditional rendering transitions)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Single waveform bar ────────────────────────────────────────────────────
// Each bar has its own independent looping animation with a phase offset
// so the bars animate at different heights creating a natural waveform look.
function WaveformBar({ phaseOffset }: { phaseOffset: number }) {
  const progress = useSharedValue(phaseOffset);

  useEffect(() => {
    // Start from the given phase offset so bars aren't all in sync
    progress.value = phaseOffset;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(progress);
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [3, 20]),
    opacity: interpolate(progress.value, [0, 1], [0.35, 1]),
  }));

  return <Animated.View style={[styles.waveBar, barStyle]} />;
}

// ─── Public interface ────────────────────────────────────────────────────────

interface ChatInputBarProps {
  /** Called when the user confirms a typed or dictated message */
  onSend: (text: string) => void;
  /** Disable sending while the AI is replying */
  disabled?: boolean;
}

/**
 * Replacement for GiftedChat's built-in InputToolbar.
 *
 * Normal state  →  pill-shaped input | mic icon | gold send button (↑)
 * Recording     →  dark pill | ✕ cancel | waveform | "Listening…" | gold confirm (✓)
 *
 * The send/confirm button rotates 360° when switching between states,
 * giving the impression the arrow spins away and the checkmark spins in.
 *
 * Voice integration: wire up the TODO comments below with expo-speech-recognition
 * (npx expo install expo-speech-recognition) to add real transcription.
 */
export default function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const insets = useSafeAreaInsets();

  // Ref mirrors isRecording so event handlers always see the current value
  // without needing to be re-registered on every render.
  const isRecordingRef = useRef(false);
  const transcriptRef = useRef('');

  // Keep refs in sync
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Declared before event hooks so error handler can reference it.
  const btnRotation = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${btnRotation.value}deg` }],
  }));

  const transitionStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  // Shared reset helper — snaps back to normal state from recording.
  // When animated=true the dark bar wipes back out (left-to-right) over 700ms.
  const resetToNormal = (animated = false) => {
    setIsRecording(false);
    setTranscript('');
    cancelAnimation(progressWidth);
    if (animated) {
      progressWidth.value = withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) });
      btnRotation.value = withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) });
    } else {
      progressWidth.value = 0;
      btnRotation.value = -90;
      btnRotation.value = withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) });
    }
  };

  // ── Speech recognition events ────────────────────────────────────────────

  useSpeechRecognitionEvent('result', (event) => {
    const first = event.results?.[0];
    if (first?.transcript) setTranscript(first.transcript);
  });

  // When recognition ends naturally (silence timeout) auto-confirm.
  useSpeechRecognitionEvent('end', () => {
    console.log('[Speech] end — isRecording:', isRecordingRef.current, 'transcript:', transcriptRef.current);
    if (!isRecordingRef.current) return;
    const finalText = transcriptRef.current;
    resetToNormal();
    if (finalText.trim()) {
      onSend(finalText.trim());
      setText('');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[Speech] error:', event.error, event.message);
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    resetToNormal();
  });

  // ── Recording handlers ───────────────────────────────────────────────────

  const handleMicPress = async () => {
    triggerHaptic('medium');
    console.log('[Dictate] mic pressed');

    // The iOS Simulator's audio device crashes AVAudioEngine due to a
    // sample-rate mismatch. Guard against it so the app doesn't terminate.
    if (!Device.isDevice) {
      Alert.alert(
        'Not Available',
        'Dictation is only available on a physical device. The iOS Simulator does not support microphone input.',
      );
      return;
    }

    // Single call handles both mic + speech recognizer on iOS.
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    console.log('[Dictate] permission result:', perm.status, 'granted:', perm.granted);

    if (!perm.granted) {
      Alert.alert(
        'Microphone Access Required',
        'Please enable microphone access in your device Settings to use dictation.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    setTranscript('');
    // Animate dark bar wipe from right-to-left in sync with button rotation
    progressWidth.value = 0;
    progressWidth.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) });
    btnRotation.value = withTiming(-90, { duration: 700, easing: Easing.inOut(Easing.ease) });
    setTimeout(() => {
      console.log('[Dictate] starting recognition...');
      setIsRecording(true);
      btnRotation.value = 0;
      try {
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
        console.log('[Dictate] start() called OK');
      } catch (e) {
        console.error('[Dictate] start() threw:', e);
        resetToNormal();
      }
    }, 700);
  };

  const handleCancel = () => {
    triggerHaptic('light');
    ExpoSpeechRecognitionModule.abort();
    resetToNormal(true);
  };

  const handleConfirm = () => {
    triggerHaptic('light');
    const finalText = transcriptRef.current || text;
    ExpoSpeechRecognitionModule.stop();
    resetToNormal();
    if (finalText.trim()) {
      onSend(finalText.trim());
      setText('');
    }
  };

  // ── Send handler ─────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    triggerHaptic('light');
    onSend(text.trim());
    setText('');
  };

  const hasText = text.trim().length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  const wrapperStyle = [styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }];

  // Single render tree so the action button is always the same React element
  // and React never remounts it — the circle stays perfectly still.
  return (
    <View style={wrapperStyle}>
      <View style={[styles.bar, isRecording && styles.barListening]}>

        {/* ── Dark wipe transition (right-to-left, behind content) ── */}
        <Animated.View style={[styles.transitionFill, transitionStyle]} />

        {/* ── Recording content ── */}
        {isRecording && (
          <>
            <TouchableOpacity onPress={handleCancel} style={styles.sideBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="rgba(200,200,200,0.9)" />
            </TouchableOpacity>
            <View style={styles.waveformRow}>
              {[0.1, 0.45, 0.8, 0.55, 0.2, 0.7, 0.35].map((phase, i) => (
                <WaveformBar key={i} phaseOffset={phase} />
              ))}
            </View>
            <Text style={styles.listeningText}>
              Listening...
            </Text>
          </>
        )}

        {/* ── Normal input content ── */}
        {!isRecording && (
          <>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Ask anything"
              placeholderTextColor="rgba(150,150,160,0.6)"
              multiline
              returnKeyType="default"
              onSubmitEditing={handleSend}
            />
            {!hasText && (
              <TouchableOpacity onPress={handleMicPress} style={styles.sideBtn} activeOpacity={0.7}>
                <Ionicons name="mic-outline" size={22} color="rgba(150,150,160,0.8)" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Action button — same element in both states, never remounted ── */}
        <Animated.View style={btnAnimStyle}>
          <TouchableOpacity
            onPress={isRecording ? () => handleConfirm() : handleSend}
            disabled={!isRecording && (!hasText || !!disabled)}
            style={[styles.actionBtn, !isRecording && !hasText && styles.actionBtnDim]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? 'checkmark' : 'arrow-up'}
              size={isRecording ? 22 : 20}
              color={theme.colors.background}
            />
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: theme.colors.background,
  },

  // Shared pill bar — geometry is identical in both states so the button never moves
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  barListening: {
    backgroundColor: '#1A1822',
    paddingLeft: 6,
  },
  transitionFill: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1A1822',
    borderRadius: 28,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 4,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  listeningText: {
    flex: 1,
    color: 'rgba(200,200,220,0.8)',
    fontSize: 16,
    marginLeft: 4,
  },

  // Shared elements
  sideBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  actionBtnDim: {
    backgroundColor: `${theme.colors.primary}44`,
  },
});
