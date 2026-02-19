import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityScreen from '../screens/CommunityScreen';
import ShareThoughtScreen from '../screens/ShareThoughtScreen';
import MyReflectionsScreen from '../screens/MyReflectionsScreen';

export type CommunityStackParamList = {
  CommunityMain: undefined;
  ShareThought: undefined;
  MyReflections: undefined;
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CommunityMain" component={CommunityScreen} />
      <Stack.Screen name="ShareThought" component={ShareThoughtScreen} />
      <Stack.Screen name="MyReflections" component={MyReflectionsScreen} />
    </Stack.Navigator>
  );
}
