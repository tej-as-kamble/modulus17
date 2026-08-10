/**
 * components/NeoButton.tsx
 * A reusable Pseudo-Neumorphic button component.
 *
 * DESIGN:
 * - In its default (raised) state, the button appears to float above the surface
 *   using the dual-shadow technique defined in the theme.
 * - When pressed, an Animated scale-down effect simulates a physical press,
 *   giving the button a tactile feel.
 * - A loading state renders an ActivityIndicator in place of the label.
 *
 * USAGE:
 *   <NeoButton label="Login" onPress={handleLogin} isLoading={isLoading} />
 *   <NeoButton label="Delete" onPress={handleDelete} variant="danger" />
 */

import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
} from '../utils/theme';

// =============================================================================
// Types
// =============================================================================

type NeoButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

interface NeoButtonProps {
  /** The label text displayed on the button. */
  label: string;
  /** The callback invoked when the button is tapped. */
  onPress: () => void;
  /** When true, an ActivityIndicator replaces the label and the button is disabled. */
  isLoading?: boolean;
  /** Controls the color scheme. Defaults to 'primary'. */
  variant?: NeoButtonVariant;
  /** Additional styles applied to the outermost container. */
  style?: ViewStyle;
  /** When true, the button is non-interactive and visually dimmed. */
  disabled?: boolean;
}

// =============================================================================
// Variant Color Map
// =============================================================================

const VARIANT_COLORS: Record<NeoButtonVariant, string> = {
  primary: COLORS.primary,
  secondary: COLORS.textSecondary,
  danger: COLORS.danger,
  success: COLORS.success,
};

// =============================================================================
// Component
// =============================================================================

const NeoButton: React.FC<NeoButtonProps> = ({
  label,
  onPress,
  isLoading = false,
  variant = 'primary',
  style,
  disabled = false,
}) => {
  // Animated value for the press-down scale micro-animation.
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /**
   * handlePressIn — Scales the button down slightly to simulate a physical press.
   * Duration is short (100ms) to feel snappy and responsive.
   */
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  /**
   * handlePressOut — Springs the button back to full scale.
   * The spring animation gives a subtle bounce that feels satisfying.
   */
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isDisabled = disabled || isLoading;
  const accentColor = VARIANT_COLORS[variant];

  return (
    <Animated.View
      style={[
        styles.shadowContainer,
        { transform: [{ scale: scaleAnim }] },
        isDisabled && styles.disabled,
        style,
      ]}>
      <TouchableOpacity
        style={[styles.button, { borderColor: accentColor }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1} // We handle the visual feedback ourselves via Animated
      >
        {isLoading ? (
          <ActivityIndicator color={accentColor} size="small" />
        ) : (
          <Text style={[styles.label, { color: accentColor } as TextStyle]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  shadowContainer: {
    // Neumorphic raised shadow — elevation provides depth on Android.
    ...NEO_SHADOW_RAISED,
    borderRadius: BORDER_RADIUS.lg,
    // Ensure the borderRadius clips the shadow correctly.
    overflow: 'visible',
  },
  button: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // Subtle left border acts as the "light edge" of the neumorphic effect.
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default NeoButton;
