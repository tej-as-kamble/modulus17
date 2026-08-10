/**
 * components/GlobalToast.tsx
 * The global Pseudo-Neumorphic toast notification component. (FR-008)
 *
 * ARCHITECTURE:
 * This component is rendered ONCE at the root layout level in App.tsx (T015),
 * positioned absolutely so it overlays all screens. It subscribes to the
 * `toast` Redux slice and reacts to `isVisible` changes.
 *
 * ANIMATION LIFECYCLE:
 * 1. `showToast` dispatched → `isVisible` becomes true.
 * 2. `useEffect` detects `isVisible: true` → slides the toast DOWN into view
 *    from above (translateY: -100 → 0) and fades it in (opacity: 0 → 1).
 * 3. After 4 seconds, `hideToast` is dispatched automatically.
 * 4. `useEffect` detects `isVisible: false` → slides the toast UP and fades
 *    it out, then resets the Animated.Values for the next appearance.
 *
 * REPLACEMENT BEHAVIOR:
 * If a new `showToast` fires while a toast is already visible, the `isVisible`
 * flag transitions false → true (or a rapid replacement may keep it true with
 * a new message). The `useEffect` dependency on `isVisible` AND `message`
 * ensures the animation restarts for rapid replacements.
 *
 * NEUMORPHIC DESIGN:
 * The toast uses `NEO_SHADOW_RAISED` for elevation on Android and follows the
 * pseudo-neumorphic style with a top-left light border for depth simulation.
 * Color variants (success/error/info) use semantic colors from the theme.
 */

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {hideToast} from '../store/slices/toastSlice';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
} from '../utils/theme';

// =============================================================================
// Toast type color map
// =============================================================================

/**
 * TOAST_COLORS
 * Maps each ToastType to a background color.
 * These follow the app's semantic color palette to maintain design consistency.
 */
const TOAST_COLORS: Record<string, string> = {
  success: COLORS.success,   // Green — task created, login succeeded
  error: COLORS.danger,      // Red   — network failure, validation error
  info: COLORS.primary,      // Purple — neutral informational message
};

/**
 * TOAST_ICONS
 * Maps each ToastType to a leading emoji icon for quick visual recognition.
 */
const TOAST_ICONS: Record<string, string> = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
};

// Auto-dismiss duration in milliseconds (FR-008 specifies 3–5 seconds)
const TOAST_DURATION_MS = 4000;

// Animation durations
const SLIDE_IN_DURATION = 280;
const SLIDE_OUT_DURATION = 220;

// =============================================================================
// Component
// =============================================================================

/**
 * GlobalToast
 * A globally positioned, Pseudo-Neumorphic toast notification component.
 * Must be rendered once at the root App.tsx level, outside any screen navigator.
 *
 * Reads from `state.toast` in Redux. Dispatches `hideToast` after auto-dismiss.
 * No props required — fully driven by Redux state.
 */
const GlobalToast: React.FC = () => {
  const dispatch = useAppDispatch();
  const {isVisible, message, type} = useAppSelector(state => state.toast);

  // Animated values for slide from bottom + fade
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Auto-dismiss timer reference — stored to allow cancellation on rapid replacement
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Clear any existing timer to handle rapid replacement cleanly
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      // ---- SLIDE IN (from bottom) ----
      // Reset values in case the toast was previously animated out.
      translateY.setValue(100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_IN_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: SLIDE_IN_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      // ---- AUTO-DISMISS TIMER ----
      // After TOAST_DURATION_MS, dispatch hideToast to trigger the slide-out.
      dismissTimer.current = setTimeout(() => {
        dispatch(hideToast());
      }, TOAST_DURATION_MS);

    } else {
      // ---- SLIDE OUT (down) ----
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: SLIDE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: SLIDE_OUT_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Cleanup on unmount: clear the auto-dismiss timer to prevent memory leaks.
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  // Re-run whenever visibility or message changes.
  // Tracking `message` ensures rapid replacements re-trigger the slide-in.
  }, [isVisible, message, dispatch, translateY, opacity]);

  // The toast is always present in the DOM but positioned off-screen when not visible.
  // This avoids mount/unmount animation glitches and ensures the slide-in always plays.
  const bgColor = TOAST_COLORS[type] || COLORS.primary;
  const icon = TOAST_ICONS[type] || 'ℹ';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY}],
          opacity,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Neumorphic toast card */}
      <View style={[styles.toastCard, {borderLeftColor: bgColor}]}>
        {/* Colored icon badge */}
        <View style={[styles.iconBadge, {backgroundColor: bgColor}]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        {/* Message text */}
        <Text style={styles.messageText} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SPACING.xl,   // Appears near the bottom of the screen
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,         // Always above all other content
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    // Neumorphic raised shadow
    elevation: NEO_SHADOW_RAISED.elevation + 4, // Extra elevation over other UI
    shadowColor: COLORS.shadowDark,
    shadowOffset: {width: 4, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // Left accent border for visual type indicator
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary, // Overridden inline by bgColor
    // Neumorphic top/left highlight border
    borderTopWidth: 1,
    borderTopColor: COLORS.shadowLight,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  iconText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 20,
  },
  messageText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});

export default GlobalToast;
