/**
 * store/slices/taskSlice.ts
 * Redux slice managing all task-related state and operations.
 *
 * This slice handles:
 *  1. CRUD Operations: Async thunks for fetching, creating, updating, and deleting tasks.
 *  2. Optimistic Updates: UI state is updated instantly before the API responds.
 *     On failure, the state is rolled back to maintain consistency.
 *  3. Debounced Status Toggle: Rapid status changes debounce the backend call by
 *     500ms to prevent race conditions while keeping the UI snappy.
 *  4. Category Filtering: A synchronous action and a memoized selector allow
 *     the UI to filter tasks by category without extra API calls.
 *  5. Optimized Sorting: A memoized selector applies a custom sorting algorithm
 *     (by deadline, dateTime, then priority weight) with O(n log n) complexity.
 *  6. Foreground Refresh: An AppState listener re-fetches tasks when the app
 *     returns to the foreground to prevent stale data.
 */

import {createAsyncThunk, createSelector, createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import {AppState} from 'react-native';
import type {AppStateStatus} from 'react-native';
import type {Task, TaskState, CreateTaskPayload, TaskCategory} from '../../types';
import apiClient from '../../services/apiClient';
import type {RootState, AppDispatch} from '../index';

// =============================================================================
// Initial State
// =============================================================================

const initialState: TaskState = {
  tasks: [],
  activeCategoryFilter: null,
  isSmartSortEnabled: false, // FR-004: Default to Standard Sort (chronological)
  isLoading: false,
  error: null,
};

// =============================================================================
// Debounce Utility
// =============================================================================

/**
 * A simple debounce implementation for the status toggle API calls.
 *
 * ALGORITHM EXPLANATION:
 * - We maintain a map of `taskId → timeoutId`.
 * - When `markTaskCompleted` is dispatched for a task, if a timeout already
 *   exists for that task (rapid re-toggle), we clear it and reset the timer.
 * - The API call only fires once the 500ms window has elapsed without
 *   another toggle for the same task.
 * - This prevents out-of-order backend responses from corrupting state.
 */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

const DEBOUNCE_DELAY_MS = 500;

/**
 * debouncedApiCall
 * Wraps an async API call with a debounce keyed by `taskId`.
 *
 * @param taskId    - The unique task identifier used as the debounce key.
 * @param apiCallFn - The async function containing the actual API request.
 * @returns         - A promise that resolves when the debounced call executes.
 */
const debouncedApiCall = (
  taskId: string,
  apiCallFn: () => Promise<void>,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If a pending call for this task exists, cancel it before resetting.
    if (debounceTimers.has(taskId)) {
      clearTimeout(debounceTimers.get(taskId)!);
    }

    // Schedule the API call after the debounce window.
    const timerId = setTimeout(async () => {
      debounceTimers.delete(taskId);
      try {
        await apiCallFn();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, DEBOUNCE_DELAY_MS);

    debounceTimers.set(taskId, timerId);
  });
};

// =============================================================================
// Async Thunks
// =============================================================================

/**
 * fetchTasks
 * Fetches all tasks for the authenticated user from the backend.
 * Called on app launch and on every foreground transition.
 *
 * No optimistic update needed for a fetch — the data comes from the server.
 */
export const fetchTasks = createAsyncThunk<Task[], void>(
  'tasks/fetchTasks',
  async (_, {rejectWithValue}) => {
    try {
      const response = await apiClient.get<{success: boolean; tasks: Task[]}>(
        '/api/tasks',
      );
      return response.data.tasks;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch tasks.',
      );
    }
  },
);

/**
 * createTask
 * Creates a new task via the backend API.
 *
 * OPTIMISTIC UPDATE PATTERN:
 * Step 1: A temporary task with a client-generated ID is inserted into Redux state immediately.
 * Step 2: The actual API request is made.
 * Step 3a (Success): The temporary task is replaced with the real server-confirmed task.
 * Step 3b (Failure): The temporary task is removed, and an error is set.
 * This gives the user instant feedback while ensuring data integrity.
 */
export const createTask = createAsyncThunk<
  Task, // Return type on success: the server-confirmed task
  CreateTaskPayload // Argument type
>(
  'tasks/createTask',
  async (payload, {rejectWithValue}) => {
    try {
      const response = await apiClient.post<{success: boolean; task: Task}>(
        '/api/tasks',
        payload,
      );
      return response.data.task;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create task.',
      );
    }
  },
);

/**
 * markTaskCompleted
 * Toggles a task's status with debounced backend synchronization.
 *
 * OPTIMISTIC UPDATE + DEBOUNCE PATTERN:
 * - The Redux state is updated instantly (handled in the slice's `prepare` callback
 *   or via the `pending` action — here we do it via `pending` reducer case).
 * - The actual PATCH API call is debounced by 500ms.
 * - If the debounced call fails, state is rolled back to the previous status.
 * - The thunk passes the `previousStatus` back on rejection to enable rollback.
 */
export const markTaskCompleted = createAsyncThunk<
  Task,
  {taskId: string; newStatus: 'pending' | 'completed'; previousStatus: 'pending' | 'completed'}
>(
  'tasks/markTaskCompleted',
  async ({taskId, newStatus}, {rejectWithValue}) => {
    try {
      // Use debouncedApiCall to delay the actual backend PATCH.
      let serverTask: Task | undefined;

      await debouncedApiCall(taskId, async () => {
        const response = await apiClient.patch<{success: boolean; task: Task}>(
          `/api/tasks/${taskId}/status`,
          {status: newStatus},
        );
        serverTask = response.data.task;
      });

      return serverTask!;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to update task status.',
        taskId,
      });
    }
  },
);

/**
 * deleteTask
 * Permanently deletes a task.
 *
 * OPTIMISTIC UPDATE PATTERN:
 * - The task is removed from Redux state immediately (pending case).
 * - If the API call fails, the task is re-inserted (rejected case).
 */
export const deleteTask = createAsyncThunk<
  string, // Returns the taskId on success for use in the fulfilled reducer
  {taskId: string; task: Task} // Pass the full task for rollback on failure
>(
  'tasks/deleteTask',
  async ({taskId}, {rejectWithValue}) => {
    try {
      await apiClient.delete(`/api/tasks/${taskId}`);
      return taskId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete task.',
      );
    }
  },
);

// =============================================================================
// Slice Definition
// =============================================================================

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    /**
     * setCategoryFilter
     * Sets the active category filter for the task list. (FR-003)
     * Pass a TaskCategory string to filter, or null to show all tasks.
     *
     * Tasks with category 'None' are only visible when filter is null (i.e., 'All').
     * This is a synchronous, zero-latency operation — no API call is made.
     * The `selectFilteredAndSortedTasks` selector recomputes the visible list instantly.
     */
    setCategoryFilter(state, action: PayloadAction<TaskCategory | null>) {
      state.activeCategoryFilter = action.payload;
    },

    /**
     * setSmartSort
     * Toggles between Standard Sort (chronological) and Smart Sort (Weighted Urgency Score).
     * (FR-004, FR-005)
     *
     * When enabled, `selectFilteredAndSortedTasks` switches from chronological
     * ordering to the mathematical urgency formula:
     *   UrgencyScore = (P * 10) + ((1 / (T_remaining + 0.1)) * 100)
     * This is a synchronous, zero-latency operation.
     */
    setSmartSort(state, action: PayloadAction<boolean>) {
      state.isSmartSortEnabled = action.payload;
    },

    /**
     * clearTaskError
     * Clears the current task error state.
     * Used by UI components after displaying a toast notification.
     */
    clearTaskError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // --- fetchTasks ---
    builder.addCase(fetchTasks.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
      state.isLoading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      // EC-01: fetchTasks.rejected — toast fired via toastMiddleware
    });

    // --- createTask ---
    builder.addCase(createTask.pending, (state, action) => {
      // OPTIMISTIC INSERT: Immediately add a placeholder task to the list.
      // The `action.meta.arg` contains the CreateTaskPayload we passed in.
      const optimisticTask: Task = {
        _id: `temp-${Date.now()}`, // Temporary ID — replaced on fulfillment
        ...action.meta.arg,
        description: action.meta.arg.description || '',
        status: 'pending',
        userId: 'pending', // Will be replaced by server response
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tasks.unshift(optimisticTask);
      state.error = null;
    });
    builder.addCase(createTask.fulfilled, (state, action: PayloadAction<Task>) => {
      // Replace the optimistic placeholder with the real server-confirmed task.
      // We identify the placeholder by its `temp-` prefixed ID.
      const tempIndex = state.tasks.findIndex(t => t._id.startsWith('temp-'));
      if (tempIndex !== -1) {
        state.tasks[tempIndex] = action.payload;
      }
      // Edge Case 2: Task created successfully — show success toast
      return state;
    });
    builder.addCase(createTask.rejected, (state, action) => {
      // ROLLBACK: Remove the optimistic placeholder that was inserted in `pending`.
      state.tasks = state.tasks.filter(t => !t._id.startsWith('temp-'));
      state.error = action.payload as string;
      // Edge Case 3: Task creation failed — error is set, toast dispatched from screen
    });

    // --- markTaskCompleted ---
    builder.addCase(markTaskCompleted.pending, (state, action) => {
      // OPTIMISTIC UPDATE: Immediately update the task status in Redux state.
      // The debounced API call will confirm this change later.
      const {taskId, newStatus} = action.meta.arg;
      const task = state.tasks.find(t => t._id === taskId);
      if (task) {
        task.status = newStatus;
      }
    });
    builder.addCase(markTaskCompleted.fulfilled, (state, action: PayloadAction<Task>) => {
      // Sync state with the server-confirmed task data.
      const index = state.tasks.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    });
    builder.addCase(markTaskCompleted.rejected, (state, action) => {
      // ROLLBACK: The debounced API call failed. Revert to the previous status.
      const rejectedPayload = action.payload as {message: string; taskId: string};
      const {taskId} = action.meta.arg;
      const {previousStatus} = action.meta.arg;
      const task = state.tasks.find(t => t._id === taskId);
      if (task) {
        task.status = previousStatus; // Restore previous state on failure
      }
      state.error = rejectedPayload?.message || 'Failed to update task.';
      // Edge Case 4: Status toggle failed — error set for toast display
    });

    // --- deleteTask ---
    builder.addCase(deleteTask.pending, (state, action) => {
      // OPTIMISTIC DELETE: Remove the task from the list immediately.
      const {taskId} = action.meta.arg;
      state.tasks = state.tasks.filter(t => t._id !== taskId);
    });
    builder.addCase(deleteTask.fulfilled, _state => {
      // The task was already removed optimistically. Nothing more to do.
      // Edge Case 5: Task deleted — success dispatch handled in DashboardScreen
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      // ROLLBACK: Re-insert the task that was optimistically removed.
      const {task} = action.meta.arg;
      state.tasks.unshift(task);
      state.error = action.payload as string;
      // Edge Case 6: Task deletion failed — error set for toast display
    });
  },
});

export const {setCategoryFilter, setSmartSort, clearTaskError} = taskSlice.actions;
export default taskSlice.reducer;

// =============================================================================
// Memoized Selectors (T016, T019)
// =============================================================================

// =============================================================================
// Memoized Selectors (FR-003, FR-004, FR-005, FR-006, FR-009)
// =============================================================================

/**
 * PRIORITY WEIGHT MAP (FR-006)
 * Maps string priority labels to numeric urgency weights for the Smart Sort algorithm.
 * Higher weight = higher urgency = sorted first (descending in the comparator).
 *
 * Space Complexity: O(1) — constant-size object, initialized once at module load.
 */
const PRIORITY_WEIGHT: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

// --- Base Selectors (input selectors for createSelector) ---

/** selectAllTasks — Extracts the raw task array from the Redux state. */
const selectAllTasks = (state: RootState): Task[] => state.tasks.tasks;

/** selectCategoryFilter — Extracts the active category filter value. */
const selectCategoryFilter = (state: RootState) => state.tasks.activeCategoryFilter;

/**
 * selectIsSmartSortEnabled — Extracts the Smart Sort toggle state. (FR-004)
 * When true, tasks are sorted by Weighted Urgency Score.
 * When false (default), tasks are sorted chronologically.
 */
const selectIsSmartSortEnabled = (state: RootState): boolean =>
  state.tasks.isSmartSortEnabled;

/**
 * selectFilteredAndSortedTasks — MASTER TASK SELECTOR (FR-003, FR-004, FR-005, FR-006)
 *
 * A deeply memoized selector (via `createSelector`) that composes two operations:
 * 1. CATEGORY FILTERING (FR-003): Filters tasks to those matching the active chip.
 * 2. CONDITIONAL SORTING (FR-004, FR-005): Applies either Standard or Smart Sort.
 *
 * MEMOIZATION GUARANTEE:
 * `createSelector` uses referential equality checking on its input selectors.
 * The expensive filter + sort computation ONLY re-runs when at least one input
 * changes: tasks[], activeCategoryFilter, or isSmartSortEnabled.
 * All other re-renders (unrelated state changes, navigation events, etc.) return
 * the cached output array, preventing unnecessary list re-renders.
 *
 * --- FILTERING ALGORITHM (FR-003) ---
 * Time Complexity:  O(n) — single-pass Array.prototype.filter.
 * Space Complexity: O(k) — where k = number of tasks matching the active filter.
 *
 * Filter Logic:
 * - null filter → all tasks visible (including 'None' category tasks).
 * - 'Work' | 'Personal' | 'Health' → only matching category tasks visible.
 * - 'None' is intentionally EXCLUDED from dashboard filter chips (FR-002);
 *   tasks with category 'None' are only visible in the 'All' (null) state.
 *
 * --- SORTING ALGORITHMS ---
 *
 * STANDARD SORT (isSmartSortEnabled = false, FR-004):
 *   Primary:   Chronological by `createdAt` descending (newest first).
 *   Rationale: Familiar, predictable ordering for users who just added tasks.
 *   Time Complexity: O(n log n) — TimSort via Array.prototype.sort.
 *
 * SMART SORT (isSmartSortEnabled = true, FR-004, FR-005, FR-006):
 *   Primary:   Descending Weighted Urgency Score.
 *   Formula:   UrgencyScore = (P * 10) + ((1 / (T_remaining + 0.1)) * 100)
 *
 *   WHERE:
 *     P            = Priority weight from PRIORITY_WEIGHT map (High=3, Med=2, Low=1)
 *     T_remaining  = Hours remaining until deadline (from now to deadline in hours)
 *                    Calculated as: (deadline_ms - now_ms) / 3_600_000
 *     + 0.1        = Epsilon guard against division-by-zero when T_remaining = 0
 *                    (task exactly at its deadline moment)
 *
 *   MATHEMATICAL RATIONALE:
 *     The formula combines two urgency signals:
 *       PRIORITY COMPONENT: (P * 10) contributes 10, 20, or 30 to the score.
 *         This ensures a High priority task always has a meaningful base advantage.
 *       TIME COMPONENT: (1 / (T_remaining + 0.1)) * 100 grows hyperbolically as
 *         deadline approaches. A task due in 0.1hr contributes ~500 to the score,
 *         while a task due in 100hrs contributes ~1. The asymptotic growth means
 *         imminent deadlines dominate the ranking, regardless of priority.
 *
 *   EDGE CASE — Missing Deadline:
 *     If a task has no deadline (null/undefined), T_remaining defaults to Infinity.
 *     1 / (Infinity + 0.1) = 0, so the time component is 0.
 *     Only the priority component contributes, effectively ranking these tasks last.
 *
 *   Time Complexity: O(n log n) — TimSort via Array.prototype.sort.
 *   Space Complexity: O(n) — `.slice()` creates a shallow copy to avoid
 *     mutating the Immer-managed Redux state array.
 */
export const selectFilteredAndSortedTasks = createSelector(
  [selectAllTasks, selectCategoryFilter, selectIsSmartSortEnabled],
  (tasks, activeFilter, isSmartSort): Task[] => {
    // ---- STEP 1: CATEGORY FILTERING (FR-003) ----
    // O(n) single-pass filter.
    const filtered = activeFilter
      ? tasks.filter(task => task.category === activeFilter)
      : tasks; // null filter = show all tasks (including 'None' category)

    // ---- STEP 2: CONDITIONAL SORTING ----
    // `.slice()` is required because Redux state arrays are immutable in Immer;
    // calling `.sort()` directly on the state reference would throw in strict mode.
    const sortable = filtered.slice();

    if (!isSmartSort) {
      // ---- STANDARD SORT: Chronological (newest createdAt first) ----
      // Simple, predictable ordering. Falls back gracefully when Smart Sort is off.
      return sortable.sort((a, b) => {
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdB - createdA; // Descending: newest first
      });
    }

    // ---- SMART SORT: Weighted Urgency Score (FR-005, FR-006) ----
    // Pre-compute the current timestamp once outside the comparator.
    // This avoids N * log(N) calls to Date.now() inside the sort loop.
    const nowMs = Date.now();

    return sortable.sort((a, b) => {
      // --- Compute T_remaining for task A ---
      // T_remaining = hours from now until the deadline.
      // If deadline is absent, treat as infinitely far (T = Infinity).
      const deadlineAMs = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const tRemainingA = deadlineAMs === Infinity
        ? Infinity
        : (deadlineAMs - nowMs) / 3_600_000; // Convert ms → hours

      // --- Compute T_remaining for task B ---
      const deadlineBMs = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      const tRemainingB = deadlineBMs === Infinity
        ? Infinity
        : (deadlineBMs - nowMs) / 3_600_000;

      // --- Retrieve priority weights (default 0 if priority is unrecognized) ---
      const pA = PRIORITY_WEIGHT[a.priority] ?? 0;
      const pB = PRIORITY_WEIGHT[b.priority] ?? 0;

      // --- Compute Weighted Urgency Score for A and B ---
      // Formula: (P * 10) + ((1 / (T_remaining + 0.1)) * 100)
      // The epsilon 0.1 guards against division-by-zero when T_remaining = 0.
      const scoreA = (pA * 10) + ((1 / (tRemainingA + 0.1)) * 100);
      const scoreB = (pB * 10) + ((1 / (tRemainingB + 0.1)) * 100);

      // Descending sort: higher urgency score comes first.
      return scoreB - scoreA;
    });
  },
);

/**
 * @deprecated Use `selectFilteredAndSortedTasks` instead.
 * Kept temporarily for backward-compatibility during migration.
 * Will be removed once DashboardScreen is updated to use the new selector.
 */
export const selectSortedFilteredTasks = selectFilteredAndSortedTasks;

// =============================================================================
// AppState Listener — Foreground Refresh (T018)
// =============================================================================

/**
 * initializeAppStateListener
 * Attaches a React Native `AppState` event listener to automatically re-fetch
 * tasks whenever the application transitions from background to foreground.
 *
 * HOW IT WORKS:
 * - `AppState.addEventListener('change', handler)` fires whenever the app's
 *   focus state changes ('active', 'background', 'inactive').
 * - We track the previous state to detect 'background' → 'active' transitions.
 * - On such a transition, `fetchTasks` is dispatched to refresh data,
 *   preventing the user from seeing stale task information after returning
 *   from another app.
 *
 * @param dispatch - The Redux store's dispatch function.
 * @returns        - A cleanup function to remove the listener on unmount.
 */
export const initializeAppStateListener = (dispatch: AppDispatch): (() => void) => {
  let previousAppState: AppStateStatus = AppState.currentState;

  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    // Only re-fetch when transitioning from background/inactive → active.
    if (
      previousAppState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // The app has come to the foreground. Re-fetch to sync with server.
      console.log('[taskSlice] App came to foreground — refreshing task list.');
      dispatch(fetchTasks());
    }

    // Update previous state for the next comparison.
    previousAppState = nextAppState;
  });

  // Return a cleanup function to remove the listener (prevents memory leaks).
  return () => subscription.remove();
};
