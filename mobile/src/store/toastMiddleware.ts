/**
 * store/toastMiddleware.ts
 * Redux Listener Middleware for automatic global toast dispatching. (FR-008, T016)
 *
 * PURPOSE:
 * Reducers in Redux are pure functions that cannot dispatch other actions.
 * To automatically dispatch `showToast` in response to async thunk lifecycle
 * events (fulfilled/rejected), we use Redux Toolkit's `createListenerMiddleware`.
 *
 * This middleware intercepts matched actions and dispatches toast notifications
 * as a side-effect, cleanly separating toast logic from the business logic slices.
 *
 * COVERED EDGE CASES (10 total, as per FR-008):
 *   EC-01: fetchTasks.rejected       → Error toast  "Could not load your tasks."
 *   EC-02: createTask.fulfilled      → Success toast "Task created!"
 *   EC-03: createTask.rejected       → Error toast  "Failed to create task."
 *   EC-04: markTaskCompleted.rejected→ Error toast  "Could not update task status."
 *   EC-05: deleteTask.fulfilled      → Success toast "Task deleted."
 *   EC-06: deleteTask.rejected       → Error toast  "Could not delete task."
 *   EC-07: registerAndSync.fulfilled → Success toast "Welcome! Account created."
 *   EC-08: registerAndSync.rejected  → Error toast  (uses server error message)
 *   EC-09: loginAndSync.fulfilled    → Success toast "Welcome back!"
 *   EC-10: loginAndSync.rejected     → Error toast  (uses server error message)
 */

import {createListenerMiddleware} from '@reduxjs/toolkit';
import {showToast} from './slices/toastSlice';
import {
  fetchTasks,
  createTask,
  markTaskCompleted,
  deleteTask,
} from './slices/taskSlice';
import {
  registerAndSync,
  loginAndSync,
} from './slices/authSlice';

// =============================================================================
// Create the Listener Middleware Instance
// =============================================================================

export const toastListenerMiddleware = createListenerMiddleware();

const startListening = toastListenerMiddleware.startListening;

// =============================================================================
// Task Toast Listeners
// =============================================================================

/**
 * EC-01: fetchTasks failed — show error toast.
 * Fires when the initial task list fetch fails (network error, auth error, etc.).
 */
startListening({
  matcher: fetchTasks.rejected.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(showToast({
      message: 'Could not load your tasks. Please check your connection.',
      type: 'error',
    }));
  },
});

/**
 * EC-02: createTask succeeded — show success toast.
 * Fires after the backend confirms the task was created.
 */
startListening({
  matcher: createTask.fulfilled.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(showToast({
      message: 'Task created successfully!',
      type: 'success',
    }));
  },
});

/**
 * EC-03: createTask failed — show error toast.
 * Fires when the backend rejects task creation (validation, network, etc.).
 */
startListening({
  matcher: createTask.rejected.match,
  effect: (action, listenerApi) => {
    const message = (action.payload as string) || 'Failed to create task.';
    listenerApi.dispatch(showToast({message, type: 'error'}));
  },
});

/**
 * EC-04: markTaskCompleted failed — show error toast.
 * Fires when the debounced status PATCH call fails.
 * The optimistic update is already rolled back by the reducer.
 */
startListening({
  matcher: markTaskCompleted.rejected.match,
  effect: (action, listenerApi) => {
    const payload = action.payload as {message?: string} | undefined;
    const message = payload?.message || 'Could not update task status.';
    listenerApi.dispatch(showToast({message, type: 'error'}));
  },
});

/**
 * EC-05: deleteTask succeeded — show success toast.
 * Fires after backend confirms permanent deletion.
 */
startListening({
  matcher: deleteTask.fulfilled.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(showToast({
      message: 'Task deleted.',
      type: 'info',
    }));
  },
});

/**
 * EC-06: deleteTask failed — show error toast.
 * Fires when backend deletion fails; the optimistic removal is rolled back by reducer.
 */
startListening({
  matcher: deleteTask.rejected.match,
  effect: (action, listenerApi) => {
    const message = (action.payload as string) || 'Could not delete task.';
    listenerApi.dispatch(showToast({message, type: 'error'}));
  },
});

// =============================================================================
// Auth Toast Listeners
// =============================================================================

/**
 * EC-07: Registration succeeded — show success toast.
 * Fires after Firebase account + backend profile are both created.
 */
startListening({
  matcher: registerAndSync.fulfilled.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(showToast({
      message: 'Welcome! Your account has been created.',
      type: 'success',
    }));
  },
});

/**
 * EC-08: Registration failed — show error toast.
 * Uses the server or Firebase error message for specificity
 * (e.g., "Email already in use", "Backend sync failed").
 */
startListening({
  matcher: registerAndSync.rejected.match,
  effect: (action, listenerApi) => {
    const message = (action.payload as string) || 'Registration failed. Please try again.';
    listenerApi.dispatch(showToast({message, type: 'error'}));
  },
});

/**
 * EC-09: Login succeeded — show success toast.
 * Fires after Firebase sign-in + backend sync both succeed.
 */
startListening({
  matcher: loginAndSync.fulfilled.match,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(showToast({
      message: 'Welcome back!',
      type: 'success',
    }));
  },
});

/**
 * EC-10: Login failed — show error toast.
 * Uses the Firebase error message for specificity (wrong password, user not found, etc.).
 */
startListening({
  matcher: loginAndSync.rejected.match,
  effect: (action, listenerApi) => {
    const message = (action.payload as string) || 'Login failed. Please check your credentials.';
    listenerApi.dispatch(showToast({message, type: 'error'}));
  },
});
