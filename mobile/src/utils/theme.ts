/**
 * utils/theme.ts
 * Pseudo-Neumorphic Design System — Unified Color & Shadow Constants.
 *
 * All UI components in the application MUST reference this file for
 * colors and shadow values to maintain a consistent Soft UI aesthetic.
 *
 * NEUMORPHIC DESIGN PRINCIPLE:
 * The illusion of depth is created by using TWO shadows on every raised element:
 *   - A LIGHT shadow on the top-left (simulates a light source from the top-left).
 *   - A DARK shadow on the bottom-right (creates the depth/shadow effect).
 * The element background color must match the container background exactly.
 *
 * INSET ELEMENTS (e.g., text inputs) use the REVERSE:
 *   - A dark shadow on the top-left (pressed into the surface).
 *   - A light shadow on the bottom-right.
 */

// =============================================================================
// Color Palette
// =============================================================================

export const COLORS = {
  // --- Backgrounds ---
  /** The primary off-white background for all screens and raised elements. */
  background: '#E8EDF2',
  /** Slightly lighter tint for hover/pressed states on raised elements. */
  backgroundLight: '#F0F4F8',

  // --- Shadow Colors ---
  /** The dark shadow (bottom-right on raised, top-left on inset). */
  shadowDark: '#BEC8D0',
  /** The light shadow (top-left on raised, bottom-right on inset). */
  shadowLight: '#FFFFFF',

  // --- Accent / Brand ---
  /** Primary brand accent — used for active states, icons, and primary buttons. */
  primary: '#6C63FF',
  /** Lighter tint of primary for backgrounds on active elements. */
  primaryLight: '#EAE9FF',

  // --- Semantic Colors ---
  /** Success green — used for the right-swipe "complete" action reveal. */
  success: '#34D399',
  /** Error/danger red — used for the left-swipe "delete" action reveal. */
  danger: '#F87171',
  /** Warning amber — used for medium-priority task indicators. */
  warning: '#FBBF24',

  // --- Text ---
  /** Primary dark text for headings and body. */
  textPrimary: '#374151',
  /** Secondary muted text for labels and placeholders. */
  textSecondary: '#9CA3AF',
  /** Inverted text on dark/accent backgrounds. */
  textInverted: '#FFFFFF',

  // --- Priority Colors ---
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
};

// =============================================================================
// Shadow Presets (React Native StyleSheet compatible)
// =============================================================================

/**
 * NEO_SHADOW_RAISED
 * Applied to any element that should appear to float ABOVE the background.
 * e.g.: NeoButton, NeoCard, FAB
 *
 * NOTE: React Native's `shadowColor`, `shadowOffset`, `shadowOpacity`, and
 * `shadowRadius` only work on iOS. On Android, `elevation` is used instead.
 * Both are included for cross-platform compatibility (although this app
 * targets Android first, the iOS shadows are included as design references).
 */
export const NEO_SHADOW_RAISED = {
  // Android elevation (primary mechanism on Android)
  elevation: 6,
  // iOS shadow properties
  shadowColor: COLORS.shadowDark,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.6,
  shadowRadius: 6,
  backgroundColor: COLORS.background,
};

/**
 * NEO_SHADOW_INSET
 * Applied to interactive elements that should appear PRESSED INTO the surface.
 * e.g.: NeoInput text fields (when focused or always).
 *
 * Achieved on React Native by combining a low-elevation container with
 * a dark top-left inner border to simulate the inset shadow.
 */
export const NEO_SHADOW_INSET = {
  elevation: 0,
  shadowColor: COLORS.shadowDark,
  shadowOffset: { width: -2, height: -2 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  backgroundColor: COLORS.backgroundLight,
};

// =============================================================================
// Border Radius
// =============================================================================

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// =============================================================================
// Typography
// =============================================================================

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// =============================================================================
// Spacing
// =============================================================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// =============================================================================
// Predefined Task Categories (FR-018)
// Fixed global list — no user-defined categories in Phase 1.
// =============================================================================

export const TASK_CATEGORIES: string[] = [
  'Work',
  'Personal',
  'Urgent',
  'Health',
  'Finance',
  'Learning',
  'Family',
  'Shopping',
  'Travel',
  'Project',
  'Social',
  'Other',
];
