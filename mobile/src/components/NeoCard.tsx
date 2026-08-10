/**
 * components/NeoCard.tsx
 * A reusable Pseudo-Neumorphic card component for displaying task items.
 *
 * DESIGN:
 * - Appears raised above the screen surface using the dual-shadow technique.
 * - Displays the task title, description preview, deadline, priority badge,
 *   category tag, and completion status.
 * - Completed tasks are visually distinguished with a muted style and
 *   a strikethrough on the title.
 *
 * USAGE:
 *   <NeoCard task={taskItem} />
 *
 * NOTE: Swipe gesture handling is NOT embedded here. The Swipeable wrapper
 * is applied in the DashboardScreen's FlatList renderItem function (T017),
 * keeping this component purely presentational (Constitution: IV.Views).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
} from '../utils/theme';
import type { Task, TaskPriority } from '../types';

// =============================================================================
// Helper: Priority Badge Color
// =============================================================================

/**
 * getPriorityColor
 * Returns the theme color for a given task priority level.
 * @param priority - The task's priority enum value.
 */
const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case 'High':
      return COLORS.priorityHigh;
    case 'Medium':
      return COLORS.priorityMedium;
    case 'Low':
      return COLORS.priorityLow;
    default:
      return COLORS.textSecondary;
  }
};

/**
 * formatDate
 * Formats an ISO 8601 date string into a human-readable short form.
 * e.g., "2026-08-15T18:30:00.000Z" → "Aug 15, 2026"
 */
const formatDate = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
};

// =============================================================================
// Types
// =============================================================================

interface NeoCardProps {
  /** The full task object to display. */
  task: Task;
}

// =============================================================================
// Component
// =============================================================================

const NeoCard: React.FC<NeoCardProps> = ({ task }) => {
  const isCompleted = task.status === 'completed';
  const priorityColor = getPriorityColor(task.priority);

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      {/* Top Row: Title + Priority Badge */}
      <View style={styles.headerRow}>
        <Text
          style={[styles.title, isCompleted && styles.titleCompleted]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {task.title}
        </Text>

        {/* Priority Badge */}
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.priorityLabel, { color: priorityColor }]}>
            {task.priority}
          </Text>
        </View>
      </View>

      {/* Description */}
      {!!task.description && (
        <Text
          style={[styles.description, isCompleted && styles.descriptionCompleted]}
          numberOfLines={2}
          ellipsizeMode="tail">
          {task.description}
        </Text>
      )}

      {/* Bottom Row: Deadline + Category + Status */}
      <View style={styles.footerRow}>
        {/* Deadline */}
        <View style={styles.metaItem}>
          {/* Calendar icon: small rect with top bar and two rows of dots */}
          <View style={styles.calendarIcon}>
            <View style={styles.calendarTop} />
            <View style={styles.calendarGrid}>
              <View style={styles.calendarDot} />
              <View style={styles.calendarDot} />
            </View>
          </View>
          <Text style={styles.metaText}>{formatDate(task.deadline)}</Text>
        </View>

        {/* Category Tag */}
        {!!task.category && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{task.category}</Text>
          </View>
        )}

        {/* Completion Status */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ Done</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  card: {
    // Neumorphic raised effect via elevation + background match.
    ...NEO_SHADOW_RAISED,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    // A subtle light top-left border reinforces the raised look.
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: COLORS.shadowLight,
    borderLeftColor: COLORS.shadowLight,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cardCompleted: {
    opacity: 0.65,
    elevation: 2, // Reduce elevation on completed tasks — they recede
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  priorityLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  descriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // Calendar icon — compact visual replacing the 📅 emoji
  calendarIcon: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 4,
  },
  calendarTop: {
    height: 4,
    backgroundColor: COLORS.textSecondary,
  },
  calendarGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 1,
  },
  calendarDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.textSecondary,
  },
  metaText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  categoryTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  completedBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  completedBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default NeoCard;
