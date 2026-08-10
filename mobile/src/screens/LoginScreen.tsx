/**
 * screens/LoginScreen.tsx
 * The user authentication entry point.
 *
 * This screen allows existing users to sign in to the application.
 * It is rendered by the AuthStack when `isAuthenticated` is false in Redux.
 *
 * WIRING:
 * - The "Login" button dispatches the `loginAndSync` Redux async thunk (FR-011).
 * - Loading state (`isLoading`) is read from the Redux `auth` slice to show a
 *   loading spinner on the button, preventing double-taps.
 * - Error state (`error`) is read from the Redux `auth` slice to display a
 *   unified error box above the form (FR-007, Edge Case: invalid credentials).
 * - The "Register" link navigates to the RegisterScreen via AuthStack.
 *
 * DESIGN: Pseudo-Neumorphic Soft UI.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginAndSync } from '../store/slices/authSlice';
import NeoButton from '../components/NeoButton';
import NeoInput from '../components/NeoInput';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
} from '../utils/theme';
import type { AuthStackParamList } from '../navigation/AuthStack';

// =============================================================================
// Types
// =============================================================================

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

// =============================================================================
// Component
// =============================================================================

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);

  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /**
   * validateForm
   * Performs client-side validation before dispatching the login thunk.
   * Returns true if the form is valid, false otherwise.
   */
  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  /**
   * handleLogin
   * Validates the form and dispatches the `loginAndSync` thunk.
   * The `unwrap()` pattern lets us catch thunk rejection directly here,
   * though the error is also stored in Redux state for display.
   */
  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(loginAndSync({ email: email.trim(), password })).unwrap();
      // On success, the Firebase auth listener (initializeAuthListener) fires,
      // dispatches setUser, and the AuthGuard automatically routes to the app.
    } catch {
      // Error is already stored in state.auth.error — the UI will re-render.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" translucent={false} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headline}>Welcome Back</Text>
            <Text style={styles.subheadline}>Sign in to continue to your tasks</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>

            {/* Unified Error Box (FR-007, Edge Case) */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            <NeoInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
            />

            <NeoInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              error={passwordError}
            />

            <NeoButton
              label="Login"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginButton}
            />

            {/* Navigate to Register */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  appName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  headline: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subheadline: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    // Raised Neumorphic card containing the form.
    ...NEO_SHADOW_RAISED,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: COLORS.shadowLight,
    borderLeftColor: COLORS.shadowLight,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  errorBox: {
    backgroundColor: COLORS.danger + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorBoxText: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  loginButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  registerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
});

export default LoginScreen;
