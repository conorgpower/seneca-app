import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { theme } from '../theme';

import {
  ChatBubbleLeftIcon as ChatOutline,
  UserGroupIcon as CommunityOutline,
  CalendarDaysIcon as TodayOutline,
  LockClosedIcon as FocusOutline,
  BookOpenIcon as ExploreOutline,
} from 'react-native-heroicons/outline';
import {
  ChatBubbleLeftIcon as ChatSolid,
  UserGroupIcon as CommunitySolid,
  CalendarDaysIcon as TodaySolid,
  LockClosedIcon as FocusSolid,
  BookOpenIcon as ExploreSolid,
} from 'react-native-heroicons/solid';

import ChatScreen from '../screens/ChatScreen';
import CommunityNavigator from './CommunityNavigator';
import TodayNavigator from './TodayNavigator';
import FocusLockScreen from '../screens/FocusLockScreen';
import ExploreNavigator from './ExploreNavigator';

const Tab = createBottomTabNavigator();

const ICON_SIZE = 24;

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
          tabBarIcon: ({ focused }) =>
            focused ? (
              <ChatSolid size={ICON_SIZE} color={theme.colors.tabBarActive} />
            ) : (
              <ChatOutline size={ICON_SIZE} color={theme.colors.tabBarInactive} />
            ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarIcon: ({ focused }) =>
            focused ? (
              <CommunitySolid size={ICON_SIZE} color={theme.colors.tabBarActive} />
            ) : (
              <CommunityOutline size={ICON_SIZE} color={theme.colors.tabBarInactive} />
            ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Today"
        component={TodayNavigator}
        options={{
          tabBarIcon: ({ focused }) =>
            focused ? (
              <TodaySolid size={ICON_SIZE} color={theme.colors.tabBarActive} />
            ) : (
              <TodayOutline size={ICON_SIZE} color={theme.colors.tabBarInactive} />
            ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusLockScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            focused ? (
              <FocusSolid size={ICON_SIZE} color={theme.colors.tabBarActive} />
            ) : (
              <FocusOutline size={ICON_SIZE} color={theme.colors.tabBarInactive} />
            ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreNavigator}
        options={{
          tabBarIcon: ({ focused }) =>
            focused ? (
              <ExploreSolid size={ICON_SIZE} color={theme.colors.tabBarActive} />
            ) : (
              <ExploreOutline size={ICON_SIZE} color={theme.colors.tabBarInactive} />
            ),
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
