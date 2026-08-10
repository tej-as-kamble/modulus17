/**
 * screens/DashboardScreen.tsx
 * The central task management dashboard.
 *
 * This screen is the heart of the application. It handles:
 *
 * 1. DATA FETCHING (T016, FR-012):
 *    - Uses `useFocusEffect` to dispatch `fetchTasks` every time the screen
 *      comes into focus, ensuring data is always fresh.
 *    - Renders a skeleton/activity loader while `isLoading` is true.
 *
 * 2. SWIPEABLE ROWS (T017, FR-005, FR-006):
 *    - Each task is wrapped in a `Swipeable` from `react-native-gesture-handler`.
 *    - Right-swipe reveals a GREEN "Complete" action → dispatches `markTaskCompleted`.
 *    - Left-swipe reveals a RED "Delete" action → dispatches `deleteTask`.
 *    - On network failure, the swipe closes and a Toast error is shown (FR-007, Edge Case).
 *
 * 3. ERROR TOAST (T018, Edge Case):
 *    - Monitors `tasks.error` from Redux. On change, shows a temporary toast
 *      notification and then clears the error.
 *
 * 4. HAMBURGER MENU (T023, US4):
 *    - A TouchableOpacity in the header dispatches `navigation.openDrawer()`.
 *
 * 5. STACKED FABs (T024, T027, US4, US5):
 *    - Primary FAB (bottom): navigates to AddTaskScreen.
 *    - Secondary FAB (top): opens the Filter/Sort bottom sheet modal.
 *
 * 6. FILTER/SORT BOTTOM SHEET (T028, US5, FR-017, FR-018, FR-019):
 *    - A custom Animated bottom sheet with category filter chips and sort toggles.
 *    - Dispatches `setCategoryFilter` to filter the task list in-place.
 *
 * 7. EMPTY STATE (FR-008):
 *    - When no tasks match the current filter, a visually pleasing empty state is shown.
 *
 * SORTED TASK DATA:
 * The component uses the `selectSortedFilteredTasks` memoized selector
 * from taskSlice to read the pre-sorted, pre-filtered task list (FR-016).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchTasks,
  markTaskCompleted,
  deleteTask,
  setCategoryFilter,
  setSmartSort,
  clearTaskError,
  selectFilteredAndSortedTasks,
} from '../store/slices/taskSlice';
import NeoCard from '../components/NeoCard';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
  TASK_CATEGORIES,
} from '../utils/theme';
import type { AppDrawerParamList } from '../navigation/AppDrawer';
import type { AppStackParamList } from '../navigation/AppDrawer';
import type { Task, TaskCategory } from '../types';

// =============================================================================
// Types
// =============================================================================

type DashboardNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, 'Dashboard'>,
  DrawerNavigationProp<AppDrawerParamList>
>;

interface DashboardScreenProps {
  navigation: DashboardNavigationProp;
}

// =============================================================================
// Toast Component
// =============================================================================

/**
 * Toast
 * A transient error notification that appears at the bottom of the screen.
 * Animated fade-in/fade-out. Auto-dismisses after 3 seconds.
 */
const Toast: React.FC<{ message: string; visible: boolean }> = ({
  message,
  visible,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <View style={styles.toastIconWrapper}>
        <View style={styles.toastIconBar} />
        <View style={styles.toastIconDot} />
      </View>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// =============================================================================
// Empty State Component
// =============================================================================

/**
 * SearchIcon — magnifying glass drawn from primitive Views.
 */
const SearchIcon: React.FC = () => (
  <View style={emptyIconStyles.searchWrapper}>
    <View style={emptyIconStyles.searchCircle} />
    <View style={emptyIconStyles.searchHandle} />
  </View>
);

/**
 * NoteIcon — document outline drawn from primitive Views.
 */
const NoteIcon: React.FC = () => (
  <View style={emptyIconStyles.noteOuter}>
    <View style={emptyIconStyles.noteLine} />
    <View style={[emptyIconStyles.noteLine, { width: '70%' }]} />
    <View style={[emptyIconStyles.noteLine, { width: '50%' }]} />
  </View>
);

const emptyIconStyles = StyleSheet.create({
  searchWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: COLORS.textSecondary,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: 4,
    height: 22,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
    right: 4,
    transform: [{ rotate: '45deg' }],
  },
  noteOuter: {
    width: 52,
    height: 64,
    borderWidth: 3,
    borderColor: COLORS.textSecondary,
    borderRadius: 6,
    padding: 10,
    justifyContent: 'center',
    gap: 7,
    marginBottom: 16,
  },
  noteLine: {
    height: 3,
    width: '100%' as unknown as number,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
  },
});

const EmptyState: React.FC<{ hasFilter: boolean }> = ({ hasFilter }) => (
  <View style={styles.emptyContainer}>
    {hasFilter ? <SearchIcon /> : <NoteIcon />}
    <Text style={styles.emptyTitle}>
      {hasFilter ? 'No matching tasks' : 'All caught up!'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {hasFilter
        ? 'Try changing your filter or adding a task in this category.'
        : 'Tap the + button below to create your first task.'}
    </Text>
  </View>
);


// =============================================================================
// Component
// =============================================================================

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectFilteredAndSortedTasks);
  const { isLoading, error, activeCategoryFilter, isSmartSortEnabled } = useAppSelector(
    state => state.tasks,
  );

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Filter/Sort bottom sheet state
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const filterSheetAnim = useRef(new Animated.Value(0)).current;

  // Keep refs to open Swipeable rows so we can close them programmatically on error
  const swipeableRefs = useRef<Map<string, SwipeableMethods | null>>(new Map());

  // =============================================================================
  // Data Fetching — FR-012 (useFocusEffect)
  // =============================================================================

  /**
   * useFocusEffect fires whenever the Dashboard screen gains focus.
   * This ensures the task list is always fresh, even after returning from
   * the AddTaskScreen or re-opening the app from the background.
   */
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTasks());
    }, [dispatch]),
  );

  // =============================================================================
  // Error Toast — Edge Case (Network failure on swipe)
  // =============================================================================

  useEffect(() => {
    if (error) {
      setToastMessage(error);
      setToastVisible(true);
      // Auto-clear the error from Redux after showing the toast.
      const timer = setTimeout(() => {
        setToastVisible(false);
        dispatch(clearTaskError());
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // =============================================================================
  // Filter/Sort Sheet Animation
  // =============================================================================

  const openFilterSheet = () => {
    setIsFilterVisible(true);
    Animated.spring(filterSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 4,
    }).start();
  };

  const closeFilterSheet = () => {
    Animated.timing(filterSheetAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsFilterVisible(false));
  };

  // =============================================================================
  // Swipe Action Handlers
  // =============================================================================

  /**
   * handleSwipeComplete
   * Dispatches markTaskCompleted on right-swipe.
   * On network failure, closes the swipeable and shows an error toast.
   * Does NOT optimistically keep the swipe open (spec: no false optimistic updates).
   */
  const handleSwipeComplete = async (task: Task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const swipeable = swipeableRefs.current.get(task._id);

    try {
      await dispatch(
        markTaskCompleted({
          taskId: task._id,
          newStatus,
          previousStatus: task.status,
        }),
      ).unwrap();
    } catch {
      // Network error: immediately close the swipeable to revert visual state.
      swipeable?.close();
    }
  };

  /**
   * handleSwipeDelete
   * Dispatches deleteTask on left-swipe.
   * On network failure, closes the swipeable to revert.
   */
  const handleSwipeDelete = async (task: Task) => {
    const swipeable = swipeableRefs.current.get(task._id);

    try {
      await dispatch(deleteTask({ taskId: task._id, task })).unwrap();
    } catch {
      // Network error: close swipeable to revert visual state.
      swipeable?.close();
    }
  };

  // =============================================================================
  // Swipe Action Render Functions
  // =============================================================================

  /**
   * RightAction — Renders the GREEN "Complete" panel (right-swipe).
   */
  const RightAction = ({ dragX, task, close }: { dragX: SharedValue<number>, task: Task, close: () => void }) => {
    const style = useAnimatedStyle(() => {
      // Swiping right-to-left produces negative dragX.
      // Opacity goes from 0 (at rest) to 1 (when dragged at least 20px).
      const opacity = interpolate(dragX.value, [0, -20], [0, 1], Extrapolation.CLAMP);
      return { opacity };
    });

    return (
      <Reanimated.View style={[styles.swipeRight, style]}>
        <TouchableOpacity
          style={styles.swipeActionContent}
          onPress={() => {
            close();
            handleSwipeComplete(task);
          }}>
          <Text style={styles.swipeIcon}>✓</Text>
          <Text style={styles.swipeLabel}>
            {task.status === 'pending' ? 'Complete' : 'Reopen'}
          </Text>
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  /**
   * LeftAction — Renders the RED "Delete" panel (left-swipe).
   */
  const LeftAction = ({ dragX, task, close }: { dragX: SharedValue<number>, task: Task, close: () => void }) => {
    const style = useAnimatedStyle(() => {
      // Swiping left-to-right produces positive dragX.
      // Opacity goes from 0 (at rest) to 1 (when dragged at least 20px).
      const opacity = interpolate(dragX.value, [0, 20], [0, 1], Extrapolation.CLAMP);
      return { opacity };
    });

    return (
      <Reanimated.View style={[styles.swipeLeft, style]}>
        <TouchableOpacity
          style={styles.swipeActionContent}
          onPress={() => {
            close();
            handleSwipeDelete(task);
          }}>
          <Text style={styles.swipeIcon}>🗑</Text>
          <Text style={styles.swipeLabel}>Delete</Text>
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  // =============================================================================
  // FlatList renderItem
  // =============================================================================

  const renderItem = ({ item }: { item: Task }) => (
    <Swipeable
      ref={(ref: SwipeableMethods | null): void => { swipeableRefs.current.set(item._id, ref); }}
      renderRightActions={(_progress: SharedValue<number>, dragX: SharedValue<number>, swipeableMethods: SwipeableMethods) =>
        <RightAction dragX={dragX} task={item} close={() => swipeableMethods.close()} />
      }
      renderLeftActions={(_progress: SharedValue<number>, dragX: SharedValue<number>, swipeableMethods: SwipeableMethods) =>
        <LeftAction dragX={dragX} task={item} close={() => swipeableMethods.close()} />
      }
      friction={2}
      overshootRight={false}
      overshootLeft={false}>
      <NeoCard task={item} />
    </Swipeable>
  );

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" translucent={false} />

      {/* ─── Custom Header ─── */}
      <View style={styles.header}>
        {/* Hamburger Menu Button (T023) */}
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => navigation.openDrawer()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, styles.hamburgerLineMid]} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Tasks</Text>

        {/* Active filter indicator */}
        {activeCategoryFilter ? (
          <TouchableOpacity
            style={styles.filterBadge}
            onPress={() => dispatch(setCategoryFilter(null))}>
            <Text style={styles.filterBadgeText}>
              {activeCategoryFilter} ✕
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* ─── Content ─── */}
      {isLoading && tasks.length === 0 ? (
        // Initial loading skeleton
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your tasks…</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={
            tasks.length === 0 ? styles.emptyList : styles.list
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState hasFilter={!!activeCategoryFilter} />
          }
          // Pull-to-refresh
          refreshing={isLoading}
          onRefresh={() => dispatch(fetchTasks())}
        />
      )}

      {/* ─── Stacked FABs (T024: Primary, T027: Secondary) ─── */}
      <View style={styles.fabContainer}>
        {/* Secondary FAB — Filter/Sort (T027) — three filter-lines icon */}
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary, NEO_SHADOW_RAISED]}
          onPress={openFilterSheet}>
          <View style={styles.filterIconWrapper}>
            <View style={[styles.filterIconBar, { width: 18 }]} />
            <View style={[styles.filterIconBar, { width: 13 }]} />
            <View style={[styles.filterIconBar, { width: 8 }]} />
          </View>
        </TouchableOpacity>

        {/* Primary FAB — Add Task (T024) — plus icon from two View bars */}
        <TouchableOpacity
          style={[styles.fab, styles.fabPrimary, NEO_SHADOW_RAISED]}
          onPress={() => navigation.navigate('AddTask')}>
          <View style={styles.plusIconWrapper}>
            <View style={styles.plusIconHBar} />
            <View style={styles.plusIconVBar} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── Error Toast (T018) ─── */}
      <Toast message={toastMessage} visible={toastVisible} />

      {/* ─── Filter/Sort Bottom Sheet Modal (T028) ─── */}
      <Modal
        visible={isFilterVisible}
        transparent
        animationType="none"
        onRequestClose={closeFilterSheet}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeFilterSheet}>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: filterSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}>
            <TouchableOpacity activeOpacity={1}>
              {/* Sheet Handle */}
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>Filter & Sort</Text>

              {/* ── Sort Mode ── */}
              <Text style={styles.sheetSectionLabel}>Sort By</Text>
              <View style={styles.sortToggleRow}>
                {/* Standard Sort chip */}
                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    !isSmartSortEnabled && styles.sortChipActive,
                  ]}
                  onPress={() => dispatch(setSmartSort(false))}>
                  <Text style={[
                    styles.sortChipText,
                    !isSmartSortEnabled && styles.sortChipTextActive,
                  ]}>Standard</Text>
                </TouchableOpacity>
                {/* Smart Sort chip */}
                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    isSmartSortEnabled && styles.sortChipActive,
                  ]}
                  onPress={() => dispatch(setSmartSort(true))}>
                  <Text style={[
                    styles.sortChipText,
                    isSmartSortEnabled && styles.sortChipTextActive,
                  ]}>Smart Sort</Text>
                </TouchableOpacity>
              </View>

              {/* ── Category Filters ── */}
              <Text style={styles.sheetSectionLabel}>Filter by Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}>
                {/* "All" chip */}
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !activeCategoryFilter && styles.categoryChipActive,
                  ]}
                  onPress={() => dispatch(setCategoryFilter(null))}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      !activeCategoryFilter && styles.categoryChipTextActive,
                    ]}>
                    All
                  </Text>
                </TouchableOpacity>

                {/* Category filter chips — 'None' is intentionally excluded per FR-002.
                    Tasks with category 'None' are only visible in the 'All' state. */}
                {TASK_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      activeCategoryFilter === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => dispatch(setCategoryFilter(cat as TaskCategory))}>
                    <Text
                      style={[
                        styles.categoryChipText,
                        activeCategoryFilter === cat &&
                        styles.categoryChipTextActive,
                      ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Close button */}
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={closeFilterSheet}>
                <Text style={styles.sheetCloseText}>Apply & Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    elevation: NEO_SHADOW_RAISED.elevation,
    shadowColor: NEO_SHADOW_RAISED.shadowColor,
    shadowOffset: NEO_SHADOW_RAISED.shadowOffset,
    shadowOpacity: NEO_SHADOW_RAISED.shadowOpacity,
    shadowRadius: NEO_SHADOW_RAISED.shadowRadius,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 1,
    marginVertical: 2,
  },
  hamburgerLineMid: {
    width: 14, // Shorter middle line for aesthetic effect
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Balances the hamburger icon on the left
  },
  filterBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  filterBadgeText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },

  // List
  list: {
    paddingBottom: 140, // Space for the stacked FABs
  },
  emptyList: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Swipe Actions
  swipeRight: {
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    width: '25%',
  },
  swipeLeft: {
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    width: '25%',
  },
  swipeActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  swipeIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textInverted,
  },
  swipeLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textInverted,
    marginTop: 2,
  },

  // FABs
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: COLORS.shadowLight,
    borderLeftColor: COLORS.shadowLight,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  fabPrimary: {
    width: 60,
    height: 60,
    backgroundColor: '#4F46E5', // Deeper indigo — more premium feel
  },
  fabSecondary: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.background,
  },
  // Plus icon for Add Task FAB — two crossing View bars
  plusIconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconHBar: {
    position: 'absolute',
    width: 22,
    height: 3,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  plusIconVBar: {
    position: 'absolute',
    width: 3,
    height: 22,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  // Filter icon for Filter/Sort FAB — three decreasing horizontal bars
  filterIconWrapper: {
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconBar: {
    height: 2.5,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },

  // Toast — error notification positioned at bottom of task list
  toast: {
    position: 'absolute',
    bottom: 110,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    elevation: NEO_SHADOW_RAISED.elevation,
    shadowColor: NEO_SHADOW_RAISED.shadowColor,
    shadowOffset: NEO_SHADOW_RAISED.shadowOffset,
    shadowOpacity: NEO_SHADOW_RAISED.shadowOpacity,
    shadowRadius: NEO_SHADOW_RAISED.shadowRadius,
  },
  toastIconWrapper: {
    width: 18,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
  },
  toastIconBar: {
    width: 2.5,
    height: 10,
    backgroundColor: COLORS.textInverted,
    borderRadius: 2,
  },
  toastIconDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textInverted,
  },
  toastText: {
    flex: 1,
    color: COLORS.textInverted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.45)',
    justifyContent: 'flex-end',
  },

  // Bottom Sheet (T028)
  bottomSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    elevation: 12,
    shadowColor: NEO_SHADOW_RAISED.shadowColor,
    shadowOffset: NEO_SHADOW_RAISED.shadowOffset,
    shadowOpacity: NEO_SHADOW_RAISED.shadowOpacity,
    shadowRadius: NEO_SHADOW_RAISED.shadowRadius,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.shadowDark,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sheetSectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryScroll: {
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
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
  sheetCloseButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    elevation: NEO_SHADOW_RAISED.elevation,
    shadowColor: NEO_SHADOW_RAISED.shadowColor,
    shadowOffset: NEO_SHADOW_RAISED.shadowOffset,
    shadowOpacity: NEO_SHADOW_RAISED.shadowOpacity,
    shadowRadius: NEO_SHADOW_RAISED.shadowRadius,
  },
  sheetCloseText: {
    color: COLORS.textInverted,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Sort toggle row (T009)
  sortToggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sortChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1.5,
    borderColor: COLORS.shadowDark,
    alignItems: 'center',
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  sortChipTextActive: {
    color: COLORS.textInverted,
  },
});

export default DashboardScreen;
