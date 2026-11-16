import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Share,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Message, Day } from 'react-native-gifted-chat';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  FireIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  LightBulbIcon,
  BuildingLibraryIcon,
  ClockIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
} from 'react-native-heroicons/solid';
import { theme } from '../theme';
import { AIDailyLimitError } from '../services/ai-proxy';
import { aiService } from '../services/ai.service';
import { getRandomTextSection } from '../services/supabase';
import { getDailyPassage } from '../services/philosophical-passages.service';
import ChatHistoryModal from '../components/ChatHistoryModal';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import MascotWelcome, { QuickChip } from '../components/MascotWelcome';
import ChatInputBar from '../components/ChatInputBar';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import { useAuth } from '../contexts/AuthContext';
import { AppBackground } from '../components/AppBackground';
import {
  saveConversation,
  loadConversation,
  convertConversationToIMessages,
} from '../services/chat-history.service';
import { drawerEvent } from '../utils/drawerEvent';

import { getSupabaseImageSource } from '../data/asset-cdn';
import { getUserProfile } from '../services/user-profile.service';
import { buildLightPersonalizationHint } from '../services/profile-context.service';
import { useAchievementCheck } from '../hooks/useAchievementCheck';

// ── Quick chip data per prompt type ─────────────────────────────────────────
const PROMPT_CHIPS: Record<string, Array<{ label: string; message: string }>> = {
  'Dealing with adversity': [
    { label: "I'm struggling",  message: "I'm struggling with something right now" },
    { label: 'Find strength',   message: 'Help me find strength in this difficulty' },
    { label: 'Move forward',    message: 'How do I move forward despite setbacks?' },
    { label: 'My story',        message: "Let me tell you what I'm going through" },
  ],
  'Finding inner peace': [
    { label: 'Calm my mind',    message: 'Help me calm my mind' },
    { label: 'Let things go',   message: "I'm struggling to let something go" },
    { label: 'Find stillness',  message: 'How do I find peace with where I am?' },
    { label: 'Quiet the chaos', message: "There's too much chaos in my mind" },
  ],
  'Living with purpose': [
    { label: 'Find my why',   message: 'Help me discover my purpose' },
    { label: 'I feel adrift', message: 'I feel lost and without direction' },
    { label: 'Take action',   message: 'I want to live with more intention' },
    { label: 'Find meaning',  message: 'What truly matters in life?' },
  ],
  'Overcoming fear': [
    { label: 'Confront my fear',    message: 'I want to talk about a fear I have' },
    { label: 'Be brave',            message: 'How do I act bravely despite fear?' },
    { label: 'What holds me back',  message: 'Something is holding me back' },
    { label: 'Embrace fear',      message: 'Teach me to embrace fear rather than avoid it' },
  ],
  'Daily wisdom': [
    { label: "Today's lesson",  message: 'What wisdom should I carry today?' },
    { label: 'Reflect with me', message: 'Help me reflect on my day' },
    { label: 'Live better',     message: 'How can I live more wisely each day?' },
    { label: 'Morning thought', message: 'Give me a morning philosophical reflection' },
  ],
  'Building character': [
    { label: 'Be virtuous',    message: 'How do I become more virtuous?' },
    { label: 'My weakness',    message: 'I want to work on a weakness of mine' },
    { label: 'Daily habits',   message: 'What habits build strong character?' },
    { label: 'Be disciplined', message: 'Help me become more disciplined' },
  ],
};

const DEFAULT_CHIPS = [
  { label: 'Guide me',         message: 'Guide me' },
  { label: 'Share wisdom',     message: 'Share wisdom with me' },
  { label: 'Help me reflect',  message: 'Help me reflect today' },
  { label: "What's on my mind", message: "I want to talk about what's on my mind" },
];

type ChatRouteParams = {
  initialContext?: string;
  initialMessage?: string;
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ChatRouteParams }, 'params'>>();
  const { user } = useAuth();
  const { checkAndNotify } = useAchievementCheck();

  const [showChat, setShowChat] = useState(false);
  const [chatVisible, setChatVisible] = useState(false); // controls render
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const userName = React.useMemo(() => {
    return user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'User');
  }, [user?.user_metadata?.name, user?.email]);

  // Check for preloaded context from navigation params
  const { initialContext, initialMessage } = route.params || {};
  const [messages, setMessages] = useState<IMessage[]>([
    {
      _id: 1,
      text: 'I am here to share the wisdom of the great philosophers - from Stoics like Marcus Aurelius and Epictetus, to thinkers like Nietzsche and Plato. What troubles your mind today?',
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Seneca',
      },
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [dailyQuote, setDailyQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPassageModal, setShowPassageModal] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [currentPromptType, setCurrentPromptType] = useState<string | undefined>();
  const conversationIdRef = useRef<string | undefined>(undefined);
  const promptTypeRef = useRef<string | undefined>(undefined);
  const userIdRef = useRef<string | undefined>(user?.id);

  // Keep refs in sync with state
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => { promptTypeRef.current = currentPromptType; }, [currentPromptType]);
  const [, forcePassageRender] = useState(0);
  const passageLoadStartMsRef = useRef<number | null>(null);
  const loggedPassageLoadedRef = useRef(false);
  const passageBackgroundImage = getSupabaseImageSource('images/background-quote.webp');
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const openChat = useCallback(() => {
    setChatVisible(true);
    setShowChat(true);
    slideAnim.setValue(SCREEN_HEIGHT);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 90,
    }).start();
  }, [slideAnim, SCREEN_HEIGHT]);

  const closeChat = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowChat(false);
      setChatVisible(false);
    });
  }, [slideAnim, SCREEN_HEIGHT]);

  useEffect(() => {
    loadDailyQuote();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLightProfileContext = async () => {
      if (!user?.id) {
        aiService.setPersonalizationHint(null);
        return;
      }

      try {
        const { profile } = await getUserProfile(user.id);
        if (!isMounted) return;

        const hint = buildLightPersonalizationHint(profile?.onboarding_answers);
        aiService.setPersonalizationHint(hint);
      } catch (error) {
        console.error('Failed to load chat personalization context:', error);
        aiService.setPersonalizationHint(null);
      }
    };

    loadLightProfileContext();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Open drawer when returning from settings — only while this tab is focused
  useFocusEffect(
    useCallback(() => {
      return drawerEvent.listen(() => setShowProfileDrawer(true));
    }, [])
  );

  // Handle preloaded context from navigation params
  useEffect(() => {
    if (initialContext && initialMessage) {
      // Start a new chat with the preloaded context
      setMessages([{
        _id: 1,
        text: 'I am here to share the wisdom of the great philosophers. I see you have a passage to discuss. Let me help you understand it.',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Seneca',
        },
      }]);
      setCurrentPromptType('Passage Discussion');
      setCurrentConversationId(undefined);
      conversationIdRef.current = undefined;
      aiService.clearHistory();
      openChat();

      // Automatically send the initial message
      setTimeout(() => {
        const userMessage: IMessage = {
          _id: Math.random().toString(),
          text: initialMessage,
          createdAt: new Date(),
          user: {
            _id: 1,
            name: userName,
          },
        };
        onSend([userMessage]);
      }, 500);
    }
  }, [initialContext, initialMessage]);

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: showChat 
        ? { display: 'none' } 
        : {
            backgroundColor: theme.colors.backgroundCard,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 20,
            paddingTop: 8,
          },
    });
  }, [showChat, navigation]);

  const loadDailyQuote = async () => {
    try {
      const passage = await getDailyPassage({ maxLength: 500 });
      if (passage) {
        // Format for display
        setDailyQuote({
          text: passage.condensed_passage,
          author: passage.source_author,
          work: passage.source_work,
          section: passage.source_section,
        });
      }
    } catch (error) {
      console.error('Error loading daily passage:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChatWithPrompt = (promptTitle: string) => {
    setMessages([]);
    setCurrentPromptType(promptTitle);
    setCurrentConversationId(undefined);
    conversationIdRef.current = undefined;
    aiService.clearHistory(); // Reset AI context for new conversation
    openChat();
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentPromptType(undefined);
    setCurrentConversationId(undefined);
    conversationIdRef.current = undefined;
    aiService.clearHistory(); // Reset AI context for new conversation
    openChat();
  };

  const loadExistingConversation = async (conversationId: string) => {
    try {
      const conversation = await loadConversation(conversationId);
      if (conversation) {
        const iMessages = convertConversationToIMessages(conversation);
        setMessages(iMessages);
        setCurrentConversationId(conversation.id);
        conversationIdRef.current = conversation.id;
        setCurrentPromptType(conversation.promptType);
        
        // Restore AI context from conversation history
        aiService.clearHistory();
        conversation.messages.forEach(msg => {
          if (msg.role !== 'system') {
            // Re-add messages to AI service history
            aiService.getHistory().push({
              role: msg.role,
              content: msg.content,
            });
          }
        });
        
        openChat();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const chatPrompts = [
    { id: 1, title: 'Dealing with adversity', Icon: FireIcon },
    { id: 2, title: 'Finding inner peace', Icon: SparklesIcon },
    { id: 3, title: 'Living with purpose', Icon: RocketLaunchIcon },
    { id: 4, title: 'Overcoming fear', Icon: BoltIcon },
    { id: 5, title: 'Daily wisdom', Icon: LightBulbIcon },
    { id: 6, title: 'Building character', Icon: BuildingLibraryIcon },
  ];

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );

    setIsTyping(true);

    try {
      const userMessage = newMessages[0].text;

      // Optionally fetch a random philosophical text as context
      const randomText = await getRandomTextSection();
      const context = randomText
        ? `From ${randomText.author}'s "${randomText.work}"${
            randomText.section ? ` (${randomText.section})` : ''
          }:\n\n${randomText.text}`
        : undefined;

      // Get AI response
      const aiResponse = await aiService.sendMessage(userMessage, context);

      const aiMessage: IMessage = {
        _id: Math.random().toString(),
        text: aiResponse,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Seneca',
        },
      };

      setMessages((previousMessages) => {
        const updatedMessages = GiftedChat.append(previousMessages, [aiMessage]);
        
        // Auto-save conversation after AI response
        // Use refs to avoid stale closure values
        const conversationIdToUse = conversationIdRef.current;
        const uid = userIdRef.current;
        const prompt = promptTypeRef.current;

        if (uid) {
          saveConversation(uid, updatedMessages, prompt, conversationIdToUse)
            .then(conversationId => {
              if (!conversationIdToUse) {
                conversationIdRef.current = conversationId;
                setCurrentConversationId(conversationId);
                // New conversation created — check chat achievements
                checkAndNotify('chat');
              }
            })
            .catch(err => console.error('Error saving conversation:', err));
        }
        
        return updatedMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message
      const errorMessage: IMessage = {
        _id: Math.random().toString(),
        text:
          error instanceof AIDailyLimitError
            ? "We've talked a great deal today. Let's pause here and continue tomorrow, with a rested mind."
            : 'I apologize, but I encountered an error. Please try again.',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Seneca',
        },
      };

      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [errorMessage])
      );
    } finally {
      setIsTyping(false);
    }
  }, []);

  const renderBubble = (props: any) => {
    return <ChatBubble {...props} />;
  };

  const renderMessage = (props: any) => {
    return (
      <Message
        {...props}
        containerStyle={{
          left: { maxWidth: '85%' },
          right: { maxWidth: '85%' },
        }}
      />
    );
  };

  // Converts a plain string from ChatInputBar into an IMessage and sends it
  const handleInputSend = useCallback((text: string) => {
    const message: IMessage = {
      _id: Math.random().toString(),
      text,
      createdAt: new Date(),
      user: { _id: 1, name: userName },
    };
    onSend([message]);
  }, [userName, onSend]);

  // Quick-reply chips — unique per selected prompt type
  const activeChips = useMemo<QuickChip[]>(() => {
    const data = currentPromptType ? (PROMPT_CHIPS[currentPromptType] ?? DEFAULT_CHIPS) : DEFAULT_CHIPS;
    return data.map(({ label, message }) => ({ label, onPress: () => handleInputSend(message) }));
  }, [currentPromptType, handleInputSend]);

  const renderFooter = () => {
    if (isTyping) {
      return <TypingIndicator />;
    }
    return null;
  };

  const renderAvatar = () => null;

  // True once the user has sent at least one message.
  const hasUserMessages = messages.some(m => m.user._id === 1);

  return (
    <AppBackground>
    {/* Chat overlay — slides up from bottom */}
    {chatVisible && (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.chatOverlay,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={closeChat} style={styles.glassButton} activeOpacity={0.7}>
              <BlurView intensity={100} tint="dark" style={styles.blurContainer}>
                <Text style={styles.backIcon}>←</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.chatBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={{ flex: 1 }}>
                {hasUserMessages ? (
                  <GiftedChat
                    messages={messages}
                    onSend={(msgs) => onSend(msgs)}
                    user={{ _id: 1 }}
                    renderBubble={renderBubble}
                    renderMessage={renderMessage}
                    renderDay={(props) => (
                      <Day
                        {...props}
                        textProps={{ style: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' } }}
                      />
                    )}
                    renderInputToolbar={() => null}
                    minInputToolbarHeight={0}
                    renderFooter={renderFooter}
                    renderAvatar={renderAvatar}
                    messagesContainerStyle={styles.messagesContainer}
                    listProps={{
                      keyboardDismissMode: 'interactive',
                      keyboardShouldPersistTaps: 'handled',
                    }}
                  />
                ) : (
                  <MascotWelcome chips={activeChips} />
                )}
              </View>
            </TouchableWithoutFeedback>

            <ChatInputBar onSend={handleInputSend} disabled={isTyping} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    )}

    {/* Landing page — always rendered underneath */}
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.landingContent}>
        <View style={styles.landingHeaderContainer}>
          <ProfileAvatar
            name={userName}
            avatarUrl={user?.user_metadata?.avatar_url}
            onPress={() => setShowProfileDrawer(true)}
          />
          <View style={styles.landingHeader}>
            <Text style={styles.landingTitle}>Chat</Text>
          </View>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <ClockIcon size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.quoteCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : dailyQuote ? (
          <TouchableOpacity
            style={styles.quoteCard}
            activeOpacity={0.85}
            onPress={() => setShowPassageModal(true)}
          >
            {passageBackgroundImage && (
              <Image
                source={passageBackgroundImage}
                style={styles.quoteBackgroundImage}
                onLoadStart={() => {
                  passageLoadStartMsRef.current = Date.now();
                }}
                onLoad={() => {
                  if (loggedPassageLoadedRef.current) return;
                  const startMs = passageLoadStartMsRef.current;
                  const elapsedMs = startMs ? Date.now() - startMs : -1;
                  console.log('[Chat] Passage background loaded', { elapsedMs });
                  loggedPassageLoadedRef.current = true;
                  forcePassageRender((v) => v + 1);
                }}
              />
            )}
            <View style={styles.quoteOverlay}>
              <Text style={styles.quoteCardTitle}>Passage of the Day</Text>
              <Text style={styles.quoteText} numberOfLines={11}>
                "{dailyQuote.text}"
              </Text>
              <Text style={styles.quoteAuthor}>
                {`— ${dailyQuote.author}${dailyQuote.work ? `, ${dailyQuote.work}` : ''}`}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.promptsSection}>
          <Text style={styles.promptsTitle}>Chat & Reflect</Text>
          <Text style={styles.promptsSubtitle}>I can assist you with these...</Text>

          <View style={styles.promptsGrid}>
            {chatPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt.id}
                style={styles.promptButton}
                onPress={() => startChatWithPrompt(prompt.title)}
              >
                <View style={styles.promptIconCircle}>
                  <prompt.Icon size={22} color={theme.colors.primary} />
                </View>
                <Text style={styles.promptText}>{prompt.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.orText}>OR</Text>

          <TouchableOpacity
            style={styles.startChatButton}
            onPress={() => startNewChat()}
          >
            <Text style={styles.startChatButtonText}>Start a new chat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ChatHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectConversation={loadExistingConversation}
      />
      <ProfileDrawer
        visible={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
      />

      {/* Passage of the Day Modal */}
      <Modal
        visible={showPassageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPassageModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPassageModal(false)}>
          <View style={styles.passageModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.passageModalCard}>
            {passageBackgroundImage && (
              <Image
                source={passageBackgroundImage}
                style={styles.passageModalImage}
              />
            )}
            <View style={styles.passageModalImageOverlay} />

            <TouchableOpacity
              style={styles.passageModalClose}
              onPress={() => setShowPassageModal(false)}
            >
              <XMarkIcon size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.passageModalContent}>
              <Text style={styles.passageModalTitle}>Passage of the Day</Text>
              <Text style={styles.passageModalQuote}>
                "{dailyQuote?.text}"
              </Text>
              <Text style={styles.passageModalAuthor}>
                {`— ${dailyQuote?.author}${dailyQuote?.work ? `, ${dailyQuote.work}` : ''}`}
              </Text>
            </View>

              </View>
            </TouchableWithoutFeedback>

            <View style={styles.passageModalActions}>
              <TouchableOpacity
                style={styles.passageModalShareBtn}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `"${dailyQuote?.text}"\n\n— ${dailyQuote?.author}${dailyQuote?.work ? `, ${dailyQuote.work}` : ''}`,
                      title: 'Passage of the Day',
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }}
              >
                <ShareIcon size={18} color={theme.colors.text} />
                <Text style={styles.passageModalShareText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passageModalChatBtn}
                onPress={() => {
                  setShowPassageModal(false);
                  startChatWithPrompt(`Help me understand this passage: "${dailyQuote?.text}"`);
                }}
              >
                <ChatBubbleLeftIcon size={18} color={theme.colors.background} />
                <Text style={styles.passageModalChatText}>Chat about this</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatOverlay: {
    zIndex: 10,
    backgroundColor: theme.colors.background,
  },
  landingContent: {
    padding: 16,
  },
  landingHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  landingHeader: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  landingIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  landingTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  quoteCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 140,
    maxHeight: Dimensions.get('window').width - 32,
    overflow: 'hidden',
  },
  quoteBackgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    aspectRatio: 1,
  },
  quoteOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    minHeight: 140,
    justifyContent: 'center',
  },
  quoteCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quoteAuthor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promptsSection: {
    marginBottom: 20,
  },
  promptsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  promptsSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  promptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  promptButton: {
    width: '48%',
    backgroundColor: theme.colors.quaternary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  promptIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  promptText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
  },
  startChatButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  startChatButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chatBody: {
    flex: 1,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 56, 64, 0.6)',
  },
  backIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -1,
  },
  historyIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  resetIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  messagesContainer: {
    backgroundColor: theme.colors.background,
  },
  inputToolbar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  inputPrimary: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    marginTop: 0,
    marginBottom: 0,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginLeft: 8,
    marginBottom: 0,
    height: 48,
  },
  sendButtonText: {
    color: theme.colors.primary,
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 38,
  },
  sendButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  // Passage of the Day Modal
  passageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  passageModalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: Dimensions.get('window').width - 40,
  },
  passageModalImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    aspectRatio: 1,
  },
  passageModalImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  passageModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  passageModalContent: {
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
    minHeight: 280,
  },
  passageModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  passageModalQuote: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  passageModalAuthor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  passageModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  passageModalShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundCard,
  },
  passageModalShareText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  passageModalChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  passageModalChatText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.background,
  },
});
