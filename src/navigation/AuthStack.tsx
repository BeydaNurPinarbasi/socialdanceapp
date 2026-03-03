import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};
