import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { getUserReflections, getUserReflectionsByStatus } from '../services/reflection.service';
import type { Reflection, ReflectionStatus } from '../types/reflection.types';
import type { CommunityStackParamList } from '../navigation/CommunityNavigator';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type NavigationProp = NativeStackNavigationProp<CommunityStackParamList, 'MyReflections'>;

type FilterTab = 'all' | ReflectionStatus;

export default function MyReflectionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [filteredReflections, setFilteredReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Load reflections
  const loadReflections = useCallback(async () => {
    if (!user) return;

    const { data, error } = await getUserReflections(user.id);
    if (!error && data) {
      setReflections(data);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadReflections();
      setLoading(false);
    };
    initialLoad();
  }, [loadReflections]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadReflections();
    }, [loadReflections])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReflections();
    setRefreshing(false);
  }, [loadReflections]);

  // Filter reflections when filter or reflections change
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredReflections(reflections);
    } else {
      setFilteredReflections(reflections.filter((r) => r.status === activeFilter));
    }
  }, [activeFilter, reflections]);

  const getStatusBadgeStyle = (status: ReflectionStatus) => {
    switch (status) {
      case 'live':
        return styles.statusBadgeLive;
      case 'queued':
        return styles.statusBadgeQueued;
      case 'completed':
        return styles.statusBadgeCompleted;
    }
  };

  const getStatusText = (status: ReflectionStatus) => {
    switch (status) {
      case 'live':
        return 'LIVE NOW';
      case 'queued':
        return 'IN QUEUE';
      case 'completed':
        return 'COMPLETED';
    }
  };

  const navigateToLiveReflection = useCallback(
    (reflectionId: string, initialReflection?: Reflection) => {
      const mainNavigator = navigation.getParent()?.getParent();
      if (mainNavigator) {
        (mainNavigator as any).navigate('LiveReflectionDetail', {
          reflectionId,
          initialReflection,
        });
      }
    },
    [navigation]
  );

  const renderReflectionCard = (reflection: Reflection) => (
    <TouchableOpacity
      key={reflection.id}
      style={styles.card}
      onPress={() => navigateToLiveReflection(reflection.id, reflection)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, getStatusBadgeStyle(reflection.status)]}>
          <Text style={styles.statusText}>{getStatusText(reflection.status)}</Text>
        </View>
        <Text style={styles.timestamp}>{dayjs(reflection.created_at).fromNow()}</Text>
      </View>

      <Text style={styles.inputText}>{reflection.input_text}</Text>
      <Text style={styles.generatedText} numberOfLines={2}>
        {reflection.generated_text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Reflections</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeFilter === 'all' && styles.tabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeFilter === 'live' && styles.tabActive]}
            onPress={() => setActiveFilter('live')}
          >
            <Text style={[styles.tabText, activeFilter === 'live' && styles.tabTextActive]}>
              Live
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeFilter === 'queued' && styles.tabActive]}
            onPress={() => setActiveFilter('queued')}
          >
            <Text style={[styles.tabText, activeFilter === 'queued' && styles.tabTextActive]}>
              Queued
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeFilter === 'completed' && styles.tabActive]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={[styles.tabText, activeFilter === 'completed' && styles.tabTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredReflections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No reflections yet</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Share your first thought to create a reflection!'
                : `You don't have any ${activeFilter} reflections.`}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('ShareThought')}
              >
                <Text style={styles.createButtonText}>Share a Thought</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {filteredReflections.map(renderReflectionCard)}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    marginBottom: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  tab: {
    paddingBottom: theme.spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.text,
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
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  createButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusBadgeLive: {
    backgroundColor: '#10b981',
  },
  statusBadgeQueued: {
    backgroundColor: '#f59e0b',
  },
  statusBadgeCompleted: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  inputText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  generatedText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
