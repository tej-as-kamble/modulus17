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
import type {Task, TaskState, CreateTaskPayload} from '../../types';
import apiClient from '../../services/apiClient';
import type {RootState, AppDispatch} from '../index';

// =============================================================================
// Initial State
// =============================================================================

const initialState: TaskState = {
  tasks: [],
  activeCategoryFilter: null,
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
     * Sets the active category filter for the task list.
     * Pass a string to filter, or null to show all tasks.
     *
     * This is a synchronous, zero-latency operation — no API call is made.
     * The `selectFilteredTasks` selector recomputes the visible list instantly.
     */
    setCategoryFilter(state, action: PayloadAction<string | null>) {
      state.activeCategoryFilter = action.payload;
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
    });
    builder.addCase(createTask.rejected, (state, action) => {
      // ROLLBACK: Remove the optimistic placeholder that was inserted in `pending`.
      state.tasks = state.tasks.filter(t => !t._id.startsWith('temp-'));
      state.error = action.payload as string;
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
    });

    // --- deleteTask ---
    builder.addCase(deleteTask.pending, (state, action) => {
      // OPTIMISTIC DELETE: Remove the task from the list immediately.
      const {taskId} = action.meta.arg;
      state.tasks = state.tasks.filter(t => t._id !== taskId);
    });
    builder.addCase(deleteTask.fulfilled, _state => {
      // The task was already removed optimistically. Nothing more to do.
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      // ROLLBACK: Re-insert the task that was optimistically removed.
      const {task} = action.meta.arg;
      state.tasks.unshift(task);
      state.error = action.payload as string;
    });
  },
});

export const {setCategoryFilter, clearTaskError} = taskSlice.actions;
export default taskSlice.reducer;

// =============================================================================
// Memoized Selectors (T016, T019)
// =============================================================================

/**
 * PRIORITY WEIGHT MAP
 * Used by the sorting algorithm to convert string priorities into numeric weights.
 * Higher weight = higher urgency = sorted first.
 *
 * Space Complexity: O(1) — constant size map.
 */
const PRIORITY_WEIGHT: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

/**
 * selectAllTasks
 * Base selector — extracts the raw task array from the Redux state.
 */
const selectAllTasks = (state: RootState): Task[] => state.tasks.tasks;

/**
 * selectCategoryFilter
 * Base selector — extracts the active category filter string.
 */
const selectCategoryFilter = (state: RootState): string | null =>
  state.tasks.activeCategoryFilter;

/**
 * selectFilteredTasks
 * CATEGORY FILTERING SELECTOR (FR-011)
 *
 * A memoized selector (via `createSelector`) that returns only the tasks
 * matching the active category filter.
 *
 * - If `activeCategoryFilter` is null, all tasks are returned.
 * - If a filter string is set, only tasks whose `category` matches are returned.
 *
 * Memoization ensures this computation only re-runs when `tasks` or
 * `activeCategoryFilter` actually change, preventing unnecessary re-renders.
 *
 * Time Complexity: O(n) — single pass filter.
 * Space Complexity: O(k) — where k = number of matching tasks.
 */
export const selectFilteredTasks = createSelector(
  [selectAllTasks, selectCategoryFilter],
  (tasks, activeFilter) => {
    if (!activeFilter) {
      return tasks; // No filter active: return full list
    }
    // Filter tasks whose category matches the active filter (case-insensitive).
    return tasks.filter(
      task => task.category?.toLowerCase() === activeFilter.toLowerCase(),
    );
  },
);

/**
 * selectSortedFilteredTasks
 * CUSTOM SORTING ALGORITHM SELECTOR (FR-012)
 *
 * A memoized selector that applies the custom multi-criteria sorting algorithm
 * to the already-filtered task list. The selector is composed on top of
 * `selectFilteredTasks` to benefit from its memoization layer.
 *
 * ALGORITHM DESIGN (Competitive Programming Approach):
 * We implement a multi-key sort comparator. The comparison priority is:
 *
 * KEY 1: Task Status — 'pending' tasks always appear before 'completed' ones.
 *         Rationale: Actionable tasks should be visible first.
 *
 * KEY 2: Deadline — Among same-status tasks, sort by deadline ascending (UTC ms).
 *         Rationale: Tasks about to expire need immediate attention.
 *         This is the primary time-based signal.
 *
 * KEY 3: Priority Weight — Among tasks with equal deadlines, sort by descending
 *         priority (High > Medium > Low).
 *         Rationale: When deadlines collide, urgency determines order.
 *
 * KEY 4: dateTime (Scheduled time) — Among identical deadline+priority tasks,
 *         sort by scheduled time ascending.
 *         Rationale: Deterministic tie-breaker using the earliest scheduled time.
 *
 * Time Complexity:  O(n log n) — JavaScript's native `Array.sort` (TimSort).
 * Space Complexity: O(n) — `slice()` is called to avoid mutating Redux state.
 *
 * NOTE: We call `.slice()` before `.sort()` because Redux state arrays are
 * immutable in Immer-managed contexts; direct mutation would throw in strict mode.
 */
export const selectSortedFilteredTasks = createSelector(
  [selectFilteredTasks],
  (filteredTasks): Task[] => {
    return filteredTasks.slice().sort((a: Task, b: Task): number => {
      // KEY 1: Status — pending tasks always appear before completed tasks.
      if (a.status !== b.status) {
        // 'pending' < 'completed' alphabetically, but we want pending first (ascending).
        return a.status === 'pending' ? -1 : 1;
      }

      // KEY 2: Deadline (ascending) — nearest deadline first.
      // Parse to milliseconds for a numeric comparison (avoids string sort bugs).
      const deadlineA = new Date(a.deadline).getTime();
      const deadlineB = new Date(b.deadline).getTime();
      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB; // Ascending: lower (earlier) deadline wins
      }

      // KEY 3: Priority Weight (descending) — highest urgency first.
      const priorityA = PRIORITY_WEIGHT[a.priority] ?? 0;
      const priorityB = PRIORITY_WEIGHT[b.priority] ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Descending: higher weight wins
      }

      // KEY 4: dateTime (ascending) — earliest scheduled time as tie-breaker.
      const dateTimeA = new Date(a.dateTime).getTime();
      const dateTimeB = new Date(b.dateTime).getTime();
      return dateTimeA - dateTimeB;
    });
  },
);

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
