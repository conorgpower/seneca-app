import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

import ChatScreen from '../screens/ChatScreen';
import CommunityNavigator from './CommunityNavigator';
import TodayNavigator from './TodayNavigator';
import ExploreNavigator from './ExploreNavigator';

const Tab = createBottomTabNavigator();

// Simple icon component using emoji
const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{emoji}</Text>
);

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarLabelStyle: styles.tabBarLabel,
        sceneStyle: styles.scene,
        headerStyle: styles.header,
        headerTintColor: theme.colors.text,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Today"
        component={TodayNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.backgroundCard,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
  },
  scene: {
    backgroundColor: theme.colors.background,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 24,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  header: {
    backgroundColor: theme.colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
  },
});
