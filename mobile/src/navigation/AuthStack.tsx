/**
 * navigation/AuthStack.tsx
 * The authentication navigation stack.
 *
 * Contains two screens: Login and Register.
 * Rendered by App.tsx when `isAuthenticated` is false in the Redux auth slice.
 *
 * The stack navigator provides the standard slide-in/slide-out transitions
 * between the Login and Register screens.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { COLORS } from '../utils/theme';

// =============================================================================
// Route Parameters Type Map
// =============================================================================

/**
 * AuthStackParamList
 * Maps each screen name to its navigation params.
 * Both screens require no params (undefined).
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

// =============================================================================
// Component
// =============================================================================

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        // Neumorphic background extends through the header.
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.primary,
        headerShadowVisible: false, // Remove Android's default header elevation/shadow
        headerBackTitle: '', // iOS: No "back" text, just the arrow
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}>

      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }} // Full-screen auth UI — hide nav header
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          title: 'Create Account',
          headerTransparent: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
