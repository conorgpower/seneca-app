import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { drawerEvent } from '../utils/drawerEvent';
import type { CommunityReflection } from '../types/reflection.types';

import AppNavigator from './AppNavigator';
import AccountSettingsScreen from '../screens/settings/AccountSettingsScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import AppearanceSettingsScreen from '../screens/settings/AppearanceSettingsScreen';
import WidgetSetupScreen from '../screens/settings/WidgetSetupScreen';
import PrivacySettingsScreen from '../screens/settings/PrivacySettingsScreen';
import SafetySupportScreen from '../screens/settings/SafetySupportScreen';
import LegalScreen from '../screens/settings/LegalScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import LegalDocumentScreen from '../screens/settings/LegalDocumentScreen';
import HelpFAQScreen from '../screens/settings/HelpFAQScreen';
import CheckInScreen from '../screens/CheckInScreen';
import PassageScreen from '../screens/PassageScreen';
import InsightScreen from '../screens/InsightScreen';
import StreakScreen from '../screens/StreakScreen';
import ReminderScreen from '../screens/ReminderScreen';
import ComicViewerScreen from '../screens/ComicViewerScreen';
import AudioLessonScreen from '../screens/AudioLessonScreen';
import LiveReflectionDetailScreen from '../screens/LiveReflectionDetailScreen';

export type MainStackParamList = {
  App: undefined;
  AccountSettings: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  AppearanceSettings: undefined;
  WidgetSetup: undefined;
  PrivacySettings: undefined;
  SafetySupport: undefined;
  Legal: undefined;
  LegalDocument: { documentKey: string; title: string };
  HelpFAQ: undefined;
  About: undefined;
  CheckIn: undefined;
  Passage: { checkInValue: number };
  Insight: { passageId: string; reflection: string };
  Streak: { newStreak: number };
  Reminder: undefined;
  ComicViewer: { comicId: string };
  AudioLesson: { lessonId: string };
  LiveReflectionDetail: { reflectionId: string; initialReflection?: CommunityReflection };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

const settingsBackButton = (goBack: () => void) => (
  <TouchableOpacity
    onPress={() => {
      goBack();
      setTimeout(() => drawerEvent.emit(), 100);
    }}
    style={{
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Ionicons name="chevron-back" size={28} color={theme.colors.text} style={{ marginLeft: -2 }} />
  </TouchableOpacity>
);

const settingsScreenOptions = {
  headerStyle: {
    backgroundColor: theme.colors.background,
  },
  headerTintColor: theme.colors.text,
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={settingsScreenOptions}>
      <Stack.Screen
        name="App"
        component={AppNavigator}
        options={{ headerShown: false }}
      />
      {/* Daily journey screens */}
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Passage"
        component={PassageScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Insight"
        component={InsightScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Streak"
        component={StreakScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reminder"
        component={ReminderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComicViewer"
        component={ComicViewerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AudioLesson"
        component={AudioLessonScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LiveReflectionDetail"
        component={LiveReflectionDetailScreen}
        options={{ headerShown: false }}
      />
      {/* Settings screens */}
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={({ navigation }) => ({
          title: 'Account',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={({ navigation }) => ({
          title: 'Notifications',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={({ navigation }) => ({
          title: 'Appearance',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="WidgetSetup"
        component={WidgetSetupScreen}
        options={({ navigation }) => ({
          title: 'Widget Setup',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={({ navigation }) => ({
          title: 'Privacy & Data',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="SafetySupport"
        component={SafetySupportScreen}
        options={({ navigation }) => ({
          title: 'Safety & Support',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ navigation }) => ({
          title: 'Legal',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({ route }) => ({
          title: route.params.title,
        })}
      />
      <Stack.Screen
        name="HelpFAQ"
        component={HelpFAQScreen}
        options={{ title: 'Help & FAQ' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={({ navigation }) => ({
          title: 'About',
          headerLeft: () => settingsBackButton(navigation.goBack),
        })}
      />
    </Stack.Navigator>
  );
}
