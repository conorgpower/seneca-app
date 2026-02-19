import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { IMessage } from 'react-native-gifted-chat';

const CACHE_KEY = '@seneca_chat_history';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  promptType?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}

/**
 * Generate a conversation title from the first user message
 */
function generateTitle(firstMessage: string): string {
  // Take first 50 characters or until first sentence ends
  let title = firstMessage.trim();
  
  // Find first sentence
  const sentenceEnd = title.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < 60) {
    title = title.substring(0, sentenceEnd + 1);
  } else if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  return title;
}

/**
 * Convert IMessage format to ConversationMessage format
 */
function convertToConversationMessage(
  message: IMessage,
  conversationId: string
): Omit<ConversationMessage, 'id'> {
  return {
    conversationId,
    role: message.user._id === 2 ? 'assistant' : 'user',
    content: message.text,
    createdAt: message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt),
  };
}

/**
 * Convert ConversationMessage to IMessage format
 */
function convertToIMessage(message: ConversationMessage): IMessage {
  return {
    _id: message.id,
    text: message.content,
    createdAt: message.createdAt,
    user: {
      _id: message.role === 'assistant' ? 2 : 1,
      name: message.role === 'assistant' ? 'Seneca' : 'You',
    },
  };
}

/**
 * Save conversation to database and cache
 */
export async function saveConversation(
  userId: string,
  messages: IMessage[],
  promptType?: string,
  existingConversationId?: string
): Promise<string> {
  try {
    
    // Filter out system messages and get user messages for title generation
    const userMessages = messages.filter(m => m.user._id !== 2);
    const title = userMessages.length > 0 
      ? generateTitle(userMessages[0].text)
      : 'New Conversation';

    let conversationId = existingConversationId;

    if (!conversationId) {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title,
          prompt_type: promptType,
          message_count: messages.length,
        })
        .select()
        .single();

      if (error) throw error;
      conversationId = data.id;
    } else {
      // Update existing conversation
      const { error } = await supabase
        .from('conversations')
        .update({
          title,
          updated_at: new Date().toISOString(),
          message_count: messages.length,
        })
        .eq('id', conversationId);

      if (error) throw error;
    }

    // Save messages (delete existing and insert all)
    if (existingConversationId) {
      await supabase
        .from('conversation_messages')
        .delete()
        .eq('conversation_id', conversationId);
    }

    const messagesToInsert = messages.map(msg => {
      const convMsg = convertToConversationMessage(msg, conversationId!);
      return {
        conversation_id: convMsg.conversationId,
        role: convMsg.role,
        content: convMsg.content,
        created_at: convMsg.createdAt.toISOString(),
      };
    });

    const { error: messagesError } = await supabase
      .from('conversation_messages')
      .insert(messagesToInsert);

    if (messagesError) throw messagesError;

    // Update cache
    await updateCache(userId);

    return conversationId!;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Load all conversations for this user
 */
export async function loadConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50); // Limit to last 50 conversations

    if (error) throw error;

    const conversations: Conversation[] = data.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      promptType: row.prompt_type,
      messageCount: row.message_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    // Update cache
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(conversations));

    return conversations;
  } catch (error) {
    console.error('Error loading conversations:', error);
    
    // Try to return cached data
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('Error reading cache:', cacheError);
    }
    
    return [];
  }
}

/**
 * Load a specific conversation with all messages
 */
export async function loadConversation(conversationId: string): Promise<ConversationWithMessages | null> {
  try {
    // Load conversation details
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Load messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    const conversation: ConversationWithMessages = {
      id: convData.id,
      userId: convData.user_id,
      title: convData.title,
      promptType: convData.prompt_type,
      messageCount: convData.message_count,
      createdAt: new Date(convData.created_at),
      updatedAt: new Date(convData.updated_at),
      messages: messagesData.map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.created_at),
      })),
    };

    return conversation;
  } catch (error) {
    console.error('Error loading conversation:', error);
    return null;
  }
}

/**
 * Convert conversation messages to IMessage format
 */
export function convertConversationToIMessages(conversation: ConversationWithMessages): IMessage[] {
  return conversation.messages.map(convertToIMessage);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;

    // Cache will be updated on next load
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Update local cache with latest conversations
 */
async function updateCache(userId: string): Promise<void> {
  try {
    const conversations = await loadConversations(userId);
    await AsyncStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

/**
 * Get cached conversations (for quick loading)
 */
export async function getCachedConversations(userId: string): Promise<Conversation[]> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Error reading cached conversations:', error);
  }
  return [];
}

/**
 * Clear cached conversations for a user
 */
export async function clearCachedConversations(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing cached conversations:', error);
  }
}
