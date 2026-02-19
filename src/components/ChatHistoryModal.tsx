import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import {
  loadConversations,
  deleteConversation,
  Conversation,
} from '../services/chat-history.service';

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export default function ChatHistoryModal({
  visible,
  onClose,
  onSelectConversation,
}: ChatHistoryModalProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await loadConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (conversationId: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(conversationId);
              setConversations(prev => prev.filter(c => c.id !== conversationId));
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getPromptIcon = (promptType?: string): string => {
    switch (promptType) {
      case 'Dealing with adversity':
        return '💪';
      case 'Finding inner peace':
        return '🧘';
      case 'Living with purpose':
        return '🎯';
      case 'Overcoming fear':
        return '⚡';
      case 'Daily wisdom':
        return '📖';
      case 'Building character':
        return '🏛️';
      default:
        return '💬';
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <View style={styles.conversationItemWrapper}>
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          onSelectConversation(item.id);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.promptIcon}>{getPromptIcon(item.promptType)}</Text>
        </View>
        <View style={styles.conversationContent}>
          <Text style={styles.conversationTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.conversationMeta}>
            {formatDate(item.updatedAt)} · {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.title)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat History</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💭</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              Start a new chat to begin your philosophical journey
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  conversationItemWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundCard,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
    marginRight: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  promptIcon: {
    fontSize: 26,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  conversationMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  deleteButtonText: {
    fontSize: 20,
    color: theme.colors.error,
    fontWeight: '400',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 72,
  },
});
