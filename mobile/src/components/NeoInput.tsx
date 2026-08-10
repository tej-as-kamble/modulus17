/**
 * components/NeoInput.tsx
 * A reusable Pseudo-Neumorphic text input component.
 *
 * DESIGN:
 * - In its default state, the input appears pressed INTO the surface (inset effect),
 *   achieved by using a low-elevation container with a dark inner border on the
 *   top-left edges and a light border on the bottom-right.
 * - On focus, a subtle border highlight in the primary accent color provides
 *   clear visual feedback about the active input field.
 * - An optional icon can be shown on the left side of the input.
 *
 * USAGE:
 *   <NeoInput
 *     label="Email"
 *     value={email}
 *     onChangeText={setEmail}
 *     placeholder="your@email.com"
 *     keyboardType="email-address"
 *   />
 *   <NeoInput label="Password" value={pw} onChangeText={setPw} secureTextEntry />
 */

import React, { useState, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '../utils/theme';

// =============================================================================
// Types
// =============================================================================

interface NeoInputProps extends Omit<TextInputProps, 'style'> {
  /** The label displayed above the input field. */
  label: string;
  /** The current text value. */
  value: string;
  /** Callback invoked when text changes. */
  onChangeText: (text: string) => void;
  /** An error message string. When non-empty, the input highlights in red. */
  error?: string;
  /** Additional styles applied to the outermost container. */
  containerStyle?: ViewStyle;
}

// =============================================================================
// Component
// =============================================================================

const NeoInput: React.FC<NeoInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Animated value drives a subtle border highlight on focus.
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false, // borderColor animations cannot use native driver
    }).start();
    textInputProps.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    textInputProps.onBlur?.(null as any);
  };

  // Interpolate border color: transparent (unfocused) → primary (focused) → danger (error)
  const borderColor = error
    ? COLORS.danger
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', COLORS.primary],
      });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label */}
      <Text
        style={[
          styles.label,
          isFocused && styles.labelFocused,
          !!error && styles.labelError,
        ]}>
        {label}
      </Text>

      {/* Inset Input Container — the neumorphic "pressed in" effect */}
      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
          !!error && styles.inputContainerError,
        ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={COLORS.textSecondary}
          {...textInputProps}
        />
      </Animated.View>

      {/* Error message */}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  labelFocused: {
    color: COLORS.primary,
  },
  labelError: {
    color: COLORS.danger,
  },
  inputContainer: {
    // Inset Neumorphic effect: low elevation + dark top/left inner borders.
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.md,
    // The inset effect is approximated by:
    // - A very low elevation (no "float")
    // - A dark top-left border
    borderWidth: 1.5,
    borderTopColor: COLORS.shadowDark,
    borderLeftColor: COLORS.shadowDark,
    borderBottomColor: COLORS.shadowLight,
    borderRightColor: COLORS.shadowLight,
    // The animated borderColor will override when focused/errored
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: COLORS.danger,
    borderTopColor: COLORS.danger,
    borderLeftColor: COLORS.danger,
  },
  input: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});

export default NeoInput;
