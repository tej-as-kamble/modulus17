/**
 * screens/RegisterScreen.tsx
 * The user registration screen for new accounts.
 *
 * WIRING:
 * - The "Create Account" button dispatches the `registerAndSync` Redux async thunk.
 * - Loading state and errors are read from the Redux `auth` slice.
 * - The "Sign In" link navigates back to LoginScreen via AuthStack.
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
import { registerAndSync } from '../store/slices/authSlice';
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

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

// =============================================================================
// Component
// =============================================================================

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);

  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  /**
   * validateForm
   * Validates all registration fields before dispatching.
   * Returns true if all fields pass validation.
   */
  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    }

    return isValid;
  };

  /**
   * handleRegister
   * Dispatches the `registerAndSync` thunk. Includes Firebase account creation
   * and atomic backend sync with rollback on failure.
   */
  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(registerAndSync({ email: email.trim(), password })).unwrap();
      // On success, initializeAuthListener fires → setUser → AuthGuard routes to app.
    } catch {
      // Error is stored in state.auth.error for display.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>✅ DoList</Text>
            <Text style={styles.headline}>Create Account</Text>
            <Text style={styles.subheadline}>
              Sign up to start organizing your life
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>

            {/* Unified Error Box (FR-007) */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {error}</Text>
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
              placeholder="At least 6 characters"
              secureTextEntry
              error={passwordError}
            />

            <NeoInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureTextEntry
              error={confirmPasswordError}
            />

            <NeoButton
              label="Create Account"
              onPress={handleRegister}
              isLoading={isLoading}
              style={styles.registerButton}
            />

            {/* Navigate to Login */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
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
  registerButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  loginText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
});

export default RegisterScreen;
