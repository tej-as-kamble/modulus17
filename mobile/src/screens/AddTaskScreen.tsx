/**
 * screens/AddTaskScreen.tsx
 * The task creation form screen.
 *
 * WIRING (FR-004, FR-010, FR-015):
 * - Validates all fields including the crucial rule: deadline >= dateTime.
 * - The submit button dispatches `createTask` and AWAITS the unwrap() before
 *   navigating back — guaranteeing the backend has confirmed the task before
 *   the UI transitions (FR-015).
 * - Loading state is displayed on the button during the API call.
 *
 * FIELDS:
 * - Title (required)
 * - Description (optional)
 * - Scheduled Date-Time (required) — picked via modal date/time pickers
 * - Deadline (required, must be >= dateTime)
 * - Priority (required) — Low / Medium / High selection chips
 * - Category (optional) — Predefined category chip selection
 *
 * DESIGN: Pseudo-Neumorphic Soft UI.
 */

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createTask } from '../store/slices/taskSlice';
import NeoButton from '../components/NeoButton';
import NeoInput from '../components/NeoInput';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
  TASK_CATEGORIES,
} from '../utils/theme';
import type { AppStackParamList } from '../navigation/AppDrawer';
import type { TaskPriority, TaskCategory } from '../types';

// =============================================================================
// Types
// =============================================================================

type AddTaskNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'AddTask'
>;

interface AddTaskScreenProps {
  navigation: AddTaskNavigationProp;
}

// =============================================================================
// Priority Options
// =============================================================================

const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High'];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: COLORS.priorityLow,
  Medium: COLORS.priorityMedium,
  High: COLORS.priorityHigh,
};

// =============================================================================
// Component
// =============================================================================

const AddTaskScreen: React.FC<AddTaskScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.tasks);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Default deadline is tomorrow
    return d;
  });
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [category, setCategory] = useState<TaskCategory>('None'); // FR-001: Default to 'None'

  // Date/Time Picker visibility state
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activePickerField, setActivePickerField] = useState<
    'dateTime' | 'deadline'
  >('dateTime');

  // Field errors
  const [titleError, setTitleError] = useState('');
  const [deadlineError, setDeadlineError] = useState('');

  // =============================================================================
  // Date Picker Handlers
  // =============================================================================

  const openDateTimePicker = (field: 'dateTime' | 'deadline') => {
    setActivePickerField(field);
    setPickerMode('date');
    if (field === 'dateTime') setShowDateTimePicker(true);
    else setShowDeadlinePicker(true);
  };

  const handleDateTimeChange = (
    _event: any,
    selectedDate?: Date,
  ) => {
    if (!selectedDate) {
      setShowDateTimePicker(false);
      setShowDeadlinePicker(false);
      return;
    }

    if (activePickerField === 'dateTime') {
      if (pickerMode === 'date') {
        // After picking date, now pick time
        setDateTime(selectedDate);
        setPickerMode('time');
      } else {
        setDateTime(selectedDate);
        setShowDateTimePicker(false);
        setPickerMode('date');
      }
    } else {
      if (pickerMode === 'date') {
        setDeadline(selectedDate);
        setPickerMode('time');
      } else {
        setDeadline(selectedDate);
        setShowDeadlinePicker(false);
        setPickerMode('date');
      }
    }
  };

  // =============================================================================
  // Form Validation
  // =============================================================================

  const validateForm = (): boolean => {
    let isValid = true;
    setTitleError('');
    setDeadlineError('');

    if (!title.trim()) {
      setTitleError('Task title is required.');
      isValid = false;
    }

    // FR-004: Deadline MUST NOT be before dateTime
    if (deadline < dateTime) {
      setDeadlineError('Deadline cannot be before the scheduled date/time.');
      isValid = false;
    }

    return isValid;
  };

  // =============================================================================
  // Submit Handler
  // =============================================================================

  /**
   * handleSubmit
   * Validates the form, dispatches `createTask`, and AWAITS the result
   * before navigating back (FR-015). If the thunk rejects (network error),
   * an Alert is shown and the user stays on the screen.
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // `unwrap()` throws on rejection, so we can catch it below.
      await dispatch(
        createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          dateTime: dateTime.toISOString(),
          deadline: deadline.toISOString(),
          priority,
          category, // Always a valid TaskCategory; defaults to 'None' (FR-001)
        }),
      ).unwrap();

      // Task confirmed by server — navigate back (FR-015).
      navigation.goBack();
    } catch (error: any) {
      // Network/server error — stay on the screen, show alert.
      Alert.alert(
        'Failed to Create Task',
        error || 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  // =============================================================================
  // Helpers
  // =============================================================================

  const formatDateTime = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" translucent={false} />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Task</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Task Title */}
          <NeoInput
            label="Task Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            error={titleError}
            returnKeyType="next"
          />

          {/* Description */}
          <NeoInput
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add more details…"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            containerStyle={styles.textAreaContainer}
          />

          {/* Priority Selection */}
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  priority === p && {
                    backgroundColor: PRIORITY_COLORS[p] + '20',
                    borderColor: PRIORITY_COLORS[p],
                  },
                ]}
                onPress={() => setPriority(p)}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: PRIORITY_COLORS[p] },
                  ]}
                />
                <Text
                  style={[
                    styles.priorityChipText,
                    priority === p && { color: PRIORITY_COLORS[p] },
                  ]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

            {/* Category Selection */}
          <Text style={styles.sectionLabel}>Category (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}>
            {/* "None" chip — represents uncategorized / no category selected */}
            <TouchableOpacity
              style={[styles.categoryChip, category === 'None' && styles.categoryChipActive]}
              onPress={() => setCategory('None')}>
              <Text
                style={[
                  styles.categoryChipText,
                  category === 'None' && styles.categoryChipTextActive,
                ]}>
                None
              </Text>
            </TouchableOpacity>

            {TASK_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat as TaskCategory)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Scheduled Date & Time */}
          <Text style={styles.sectionLabel}>Scheduled Date & Time *</Text>
          <TouchableOpacity
            style={[styles.dateButton, NEO_SHADOW_RAISED]}
            onPress={() => openDateTimePicker('dateTime')}>
            {/* Calendar icon */}
            <View style={styles.dateIconView}>
              <View style={styles.dateIconTop} />
              <View style={styles.dateIconGrid}>
                <View style={styles.dateIconDot} />
                <View style={styles.dateIconDot} />
                <View style={styles.dateIconDot} />
              </View>
            </View>
            <Text style={styles.dateValue}>{formatDateTime(dateTime)}</Text>
          </TouchableOpacity>

          {/* Deadline */}
          <Text style={styles.sectionLabel}>Deadline *</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              NEO_SHADOW_RAISED,
              !!deadlineError && styles.dateButtonError,
            ]}
            onPress={() => openDateTimePicker('deadline')}>
            {/* Clock icon: circle + hands */}
            <View style={styles.clockIconView}>
              <View style={styles.clockHourHand} />
              <View style={styles.clockMinuteHand} />
            </View>
            <Text style={styles.dateValue}>{formatDateTime(deadline)}</Text>
          </TouchableOpacity>
          {!!deadlineError && (
            <Text style={styles.fieldErrorText}>{deadlineError}</Text>
          )}

          {/* Submit Button */}
          <NeoButton
            label="Create Task"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date-Time Picker — for Scheduled DateTime */}
      {showDateTimePicker && (
        <DateTimePicker
          value={dateTime}
          mode={pickerMode}
          display="default"
          onChange={handleDateTimeChange}
          minimumDate={new Date()}
        />
      )}

      {/* Date-Time Picker — for Deadline */}
      {showDeadlinePicker && (
        <DateTimePicker
          value={deadline}
          mode={pickerMode}
          display="default"
          onChange={handleDateTimeChange}
          minimumDate={dateTime} // Deadline cannot be before scheduled time (FR-004)
        />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...NEO_SHADOW_RAISED,
    borderRadius: BORDER_RADIUS.sm,
  },
  backIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  textAreaContainer: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Priority chips
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.shadowDark,
    backgroundColor: COLORS.backgroundLight,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },

  // Category chips
  categoryScroll: {
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.shadowDark,
    marginRight: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.textInverted,
  },

  // Date buttons
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: COLORS.shadowLight,
    borderLeftColor: COLORS.shadowLight,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  dateButtonError: {
    borderColor: COLORS.danger,
    borderTopColor: COLORS.danger,
    borderLeftColor: COLORS.danger,
    borderWidth: 1,
  },
  // Calendar icon for Scheduled Date button
  dateIconView: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  dateIconTop: {
    height: 5,
    backgroundColor: COLORS.primary,
  },
  dateIconGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 1,
  },
  dateIconDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: COLORS.textSecondary,
  },
  // Clock icon for Deadline button
  clockIconView: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clockHourHand: {
    position: 'absolute',
    width: 1.5,
    height: 5,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 1,
    bottom: '50%',
    left: '50%',
    marginLeft: -0.75,
  },
  clockMinuteHand: {
    position: 'absolute',
    width: 5,
    height: 1.5,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 1,
    top: '50%',
    left: '50%',
    marginTop: -0.75,
  },
  dateValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
  },
  fieldErrorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },

  // Submit
  submitButton: {
    marginTop: SPACING.lg,
  },
});

export default AddTaskScreen;
