import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme';
import { aiService } from '../services/ai.service';
import { getRandomTextSection } from '../services/supabase';
import { getDailyPassage } from '../services/philosophical-passages.service';
import ChatHistoryModal from '../components/ChatHistoryModal';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfileDrawer from '../components/ProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import {
  saveConversation,
  loadConversation,
  convertConversationToIMessages,
} from '../services/chat-history.service';
import { drawerEvent } from '../utils/drawerEvent';
import { triggerHaptic } from '../hooks/useAppPreferences';
import { getSupabaseImageSource } from '../data/asset-cdn';
import { getUserProfile } from '../services/user-profile.service';
import { buildLightPersonalizationHint } from '../services/profile-context.service';

type ChatRouteParams = {
  initialContext?: string;
  initialMessage?: string;
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ChatRouteParams }, 'params'>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [showChat, setShowChat] = useState(false);
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
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [currentPromptType, setCurrentPromptType] = useState<string | undefined>();
  const conversationIdRef = useRef<string | undefined>(undefined);
  const [, forcePassageRender] = useState(0);
  const passageLoadStartMsRef = useRef<number | null>(null);
  const loggedPassageLoadedRef = useRef(false);
  const passageBackgroundImage = getSupabaseImageSource('images/background-quote.webp');

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

  // Open drawer when returning from settings
  useEffect(() => {
    return drawerEvent.listen(() => setShowProfileDrawer(true));
  }, []);

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
      setShowChat(true);

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

  const startChatWithPrompt = async (promptTitle: string) => {
    let openingMessage = '';
    
    switch(promptTitle) {
      case 'Dealing with adversity':
        openingMessage = '"The impediment to action advances action. What stands in the way becomes the way." - Marcus Aurelius\n\nAdversity is not your enemy, but your teacher. Every obstacle contains within it the seeds of growth and strength. Tell me, what challenge weighs upon you?';
        break;
      case 'Finding inner peace':
        openingMessage = '"You have power over your mind - not outside events. Realize this, and you will find strength." - Marcus Aurelius\n\nTrue peace comes not from controlling the world around you, but from mastering the world within. What disturbs your tranquility?';
        break;
      case 'Living with purpose':
        openingMessage = '"He who has a why to live can bear almost any how." - Nietzsche\n\nPurpose is the compass that guides us through life\'s storms. It transforms mere existence into meaningful action. What calls to your soul?';
        break;
      case 'Overcoming fear':
        openingMessage = '"We suffer more often in imagination than in reality." - Seneca\n\nFear is often the shadow of things that may never come to pass. Courage is not the absence of fear, but action in spite of it. What fear holds you back?';
        break;
      case 'Daily wisdom':
        openingMessage = '"The unexamined life is not worth living." - Socrates\n\nEach day offers an opportunity to live with greater wisdom and virtue. Philosophy is not mere theory, but a way of life. What wisdom do you seek today?';
        break;
      case 'Building character':
        openingMessage = '"Waste no more time arguing about what a good man should be. Be one." - Marcus Aurelius\n\nCharacter is forged in the crucible of daily choices. Virtue is not an abstract ideal, but a practice. What aspect of your character do you wish to strengthen?';
        break;
      default:
        openingMessage = 'I am here to share the wisdom of the great philosophers - from Stoics like Marcus Aurelius and Epictetus, to thinkers like Nietzsche and Plato. What troubles your mind today?';
    }

    setMessages([{
      _id: 1,
      text: openingMessage,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Seneca',
      },
    }]);
    setCurrentPromptType(promptTitle);
    setCurrentConversationId(undefined);
    conversationIdRef.current = undefined;
    aiService.clearHistory(); // Reset AI context for new conversation
    setShowChat(true);
  };

  const startNewChat = () => {
    setMessages([{
      _id: 1,
      text: 'I am here to share the wisdom of the great philosophers - from Stoics like Marcus Aurelius and Epictetus, to thinkers like Nietzsche and Plato. What troubles your mind today?',
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Seneca',
      },
    }]);
    setCurrentPromptType(undefined);
    setCurrentConversationId(undefined);
    conversationIdRef.current = undefined;
    aiService.clearHistory(); // Reset AI context for new conversation
    setShowChat(true);
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
        
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const chatPrompts = [
    { id: 1, title: 'Dealing with adversity', icon: '💪' },
    { id: 2, title: 'Finding inner peace', icon: '🧘' },
    { id: 3, title: 'Living with purpose', icon: '🎯' },
    { id: 4, title: 'Overcoming fear', icon: '⚡' },
    { id: 5, title: 'Daily wisdom', icon: '📖' },
    { id: 6, title: 'Building character', icon: '🏛️' },
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
        // Use ref to avoid race conditions when starting new chats
        const conversationIdToUse = conversationIdRef.current;
        
        if (user?.id) {
          saveConversation(user.id, updatedMessages, currentPromptType, conversationIdToUse)
            .then(conversationId => {
              if (!conversationIdToUse) {
                conversationIdRef.current = conversationId;
                setCurrentConversationId(conversationId);
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
        text: 'I apologize, but I encountered an error. Please try again.',
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
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: theme.colors.backgroundCard,
          },
          right: {
            backgroundColor: theme.colors.primary,
          },
        }}
        textStyle={{
          left: {
            color: theme.colors.text,
            fontSize: 16,
          },
          right: {
            color: '#FFFFFF',
            fontSize: 16,
          },
        }}
      />
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  const renderFooter = () => {
    if (isTyping) {
      return (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    return null;
  };

  const renderAvatar = () => null;

  if (showChat) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setShowChat(false)} style={styles.glassButton} activeOpacity={0.7}>
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
          <GiftedChat
            messages={messages}
            onSend={(messages) => onSend(messages)}
            isKeyboardInternallyHandled={false}
            bottomOffset={Platform.OS === 'ios' ? insets.bottom : 0}
            user={{
              _id: 1,
            }}
            renderBubble={renderBubble}
            renderInputToolbar={renderInputToolbar}
            renderFooter={renderFooter}
            renderAvatar={renderAvatar}
            messagesContainerStyle={styles.messagesContainer}
            listViewProps={{
              keyboardDismissMode: 'interactive',
              keyboardShouldPersistTaps: 'handled',
            }}
            textInputProps={{
              style: styles.textInput,
              placeholder: 'Type a message...',
              placeholderTextColor: '#808080',
            }}
            renderSend={(props) => (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => {
                  if (props.text && props.onSend) {
                    triggerHaptic('light');
                    props.onSend({ text: props.text.trim() }, true);
                  }
                }}
                disabled={!props.text || props.text.trim().length === 0}
              >
                <Text style={[
                  styles.sendButtonText,
                  (!props.text || props.text.trim().length === 0) && styles.sendButtonTextDisabled
                ]}>➤</Text>
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.landingContent}>
        <View style={styles.landingHeaderContainer}>
          <ProfileAvatar 
            name={userName}
            onPress={() => setShowProfileDrawer(true)}
          />
          <View style={styles.landingHeader}>
            <Text style={styles.landingTitle}>Chat</Text>
          </View>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <Text style={styles.historyButtonIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.quoteCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : dailyQuote ? (
          <View style={styles.quoteCard}>
            {passageBackgroundImage ? (
              <ImageBackground
                source={passageBackgroundImage}
                style={styles.quoteBackgroundImage}
                imageStyle={styles.quoteBackgroundImageStyle}
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
              >
                <View style={styles.quoteOverlay}>
                  <Text style={styles.quoteCardTitle}>Passage of the Day</Text>
                  <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
                  <Text style={styles.quoteAuthor}>
                    {`— ${dailyQuote.author}${dailyQuote.work ? `, ${dailyQuote.work}` : ''}`}
                  </Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={styles.quoteOverlay}>
                <Text style={styles.quoteCardTitle}>Passage of the Day</Text>
                <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
                <Text style={styles.quoteAuthor}>
                  {`— ${dailyQuote.author}${dailyQuote.work ? `, ${dailyQuote.work}` : ''}`}
                </Text>
              </View>
            )}
          </View>
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
                <Text style={styles.promptIcon}>{prompt.icon}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  historyButtonIcon: {
    fontSize: 20,
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
    overflow: 'hidden',
  },
  quoteBackgroundImage: {
    width: '100%',
    minHeight: 140,
    justifyContent: 'center',
  },
  quoteBackgroundImageStyle: {
    borderRadius: 12,
  },
  quoteOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
    minHeight: 140,
    justifyContent: 'center',
  },
  quoteCardTitle: {
    fontSize: 16,
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
    marginBottom: 16,
  },
  promptButton: {
    width: '48%',
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  promptIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  promptText: {
    fontSize: 12,
    color: theme.colors.text,
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
    fontSize: 15,
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
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
