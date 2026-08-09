/**
 * index.ts
 * Central TypeScript type definitions for the Frontend State & Services layer.
 *
 * These interfaces are the single source of truth for data shapes used across
 * the Redux store, API client, and service wrappers. They are designed to match
 * the backend Mongoose schemas exactly to guarantee type safety at the boundary.
 */

// =============================================================================
// Task Domain Types
// =============================================================================

/**
 * TaskPriority — The allowed urgency levels for a task.
 * Maps exactly to the backend Task schema priority enum.
 */
export type TaskPriority = 'Low' | 'Medium' | 'High';

/**
 * TaskStatus — The lifecycle states of a task.
 * Maps exactly to the backend Task schema status enum.
 */
export type TaskStatus = 'pending' | 'completed';

/**
 * Task — The full task entity as returned by the backend API.
 * All date fields are ISO 8601 strings (IST-converted by backend).
 */
export interface Task {
  _id: string;
  title: string;
  description: string;
  dateTime: string; // ISO 8601 Date string (IST)
  deadline: string; // ISO 8601 Date string (IST)
  priority: TaskPriority;
  status: TaskStatus;
  category?: string; // Optional category tag for filtering
  userId: string; // Reference ID to the owning user
  createdAt: string;
  updatedAt: string;
}

/**
 * CreateTaskPayload — The request body shape for creating a new task.
 * Omits server-generated fields (_id, status, userId, timestamps).
 */
export interface CreateTaskPayload {
  title: string;
  description?: string;
  dateTime: string;
  deadline: string;
  priority: TaskPriority;
  category?: string;
}

// =============================================================================
// Auth State Types
// =============================================================================

/**
 * UserProfile — The minimal user profile stored in Redux after authentication.
 * Sourced from the Firebase UserCredential after successful sign-in.
 */
export interface UserProfile {
  uid: string;
  email: string | null;
}

/**
 * AuthState — The shape of the global authentication slice in the Redux store.
 *
 * - user: null when unauthenticated, populated with uid/email when authenticated.
 * - isAuthenticated: derived flag for routing guard checks.
 * - isLoading: true during any async auth operation (login, register, logout).
 * - error: holds the last auth error message for UI display.
 */
export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Task State Types
// =============================================================================

/**
 * TaskState — The shape of the global task slice in the Redux store.
 *
 * - tasks: the complete list of tasks fetched from the backend.
 * - activeCategoryFilter: the currently selected category string for filtering,
 *   or null when no filter is active (showing all tasks).
 * - isLoading: true during any async task operation (fetch, create, delete, etc.).
 * - error: holds the last task error message for UI display.
 */
export interface TaskState {
  tasks: Task[];
  activeCategoryFilter: string | null;
  isLoading: boolean;
  error: string | null;
}
