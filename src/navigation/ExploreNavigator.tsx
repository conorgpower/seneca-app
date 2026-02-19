import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExploreScreen from '../screens/ExploreScreen';
import BookReaderScreen from '../screens/BookReaderScreen';

export type ExploreStackParamList = {
  ExploreMain: undefined;
  BookReader: {
    workId: string;
  };
};

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export default function ExploreNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
      <Stack.Screen name="BookReader" component={BookReaderScreen} />
    </Stack.Navigator>
  );
}
