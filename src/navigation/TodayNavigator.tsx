import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';

export type TodayStackParamList = {
  TodayMain: undefined;
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<TodayStackParamList>();

export default function TodayNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TodayMain" component={TodayScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
    </Stack.Navigator>
  );
}
