/**
 * store/slices/toastSlice.ts
 * Redux slice managing the global UI toast notification system. (FR-008)
 *
 * DESIGN PHILOSOPHY — SINGLE ACTIVE TOAST:
 * The system maintains exactly ONE active toast object at any time.
 * If a new toast is dispatched while one is already visible, it IMMEDIATELY
 * replaces the current one (no queue, no stacking). This behavior:
 *   1. Prevents notification overflow and UI clutter.
 *   2. Ensures the most recent, most relevant message is always shown.
 *   3. Simplifies the state model to a flat, single-item structure.
 *
 * GLOBAL ACCESS PATTERN:
 * Any Redux thunk, async action, or component in the application can dispatch
 * `showToast({ message, type })` to trigger a notification. The root-level
 * `<GlobalToast />` component in App.tsx subscribes to this slice and renders
 * the notification, eliminating the need for prop-drilling or context.
 *
 * TOAST LIFECYCLE:
 * showToast(payload) → isVisible: true, message/type set
 * [Timer fires after 4 seconds] → hideToast() dispatched
 * hideToast() → isVisible: false (component fades out and unmounts)
 *
 * The 4-second auto-dismiss timer lives in the <GlobalToast /> component,
 * NOT in this slice, to keep the slice purely synchronous and testable.
 */

import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

// =============================================================================
// Types
// =============================================================================

/**
 * ToastType — The visual variant of the toast notification.
 * Determines the color scheme rendered by the <GlobalToast /> component.
 *  - 'success': Green (task created, login succeeded, etc.)
 *  - 'error':   Red   (network failure, validation error, auth error, etc.)
 *  - 'info':    Blue  (neutral informational messages)
 */
export type ToastType = 'success' | 'error' | 'info';

/**
 * ToastPayload — The data required to show a toast notification.
 */
export interface ToastPayload {
  message: string;
  type: ToastType;
}

/**
 * ToastState — The shape of the global toast slice in the Redux store.
 *
 * - isVisible: true while a toast is on screen. The <GlobalToast /> component
 *   uses this to trigger the animation and auto-dismiss timer.
 * - message:   The text content displayed in the toast.
 * - type:      The visual variant; drives color selection in the component.
 */
export interface ToastState {
  isVisible: boolean;
  message: string;
  type: ToastType;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ToastState = {
  isVisible: false,
  message: '',
  type: 'info',
};

// =============================================================================
// Slice Definition
// =============================================================================

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    /**
     * showToast
     * Dispatched by any thunk or component to display a global toast.
     *
     * REPLACEMENT BEHAVIOR: If `isVisible` is already true when this action
     * fires, the state is simply overwritten with the new message and type.
     * This achieves the "immediate replacement" behavior required by FR-008.
     *
     * @param action.payload.message - The notification text to display.
     * @param action.payload.type    - The variant: 'success' | 'error' | 'info'.
     */
    showToast(state, action: PayloadAction<ToastPayload>) {
      state.isVisible = true;
      state.message = action.payload.message;
      state.type = action.payload.type;
    },

    /**
     * hideToast
     * Dispatched by the <GlobalToast /> component after the auto-dismiss timer
     * expires (typically 4 seconds after the toast appears).
     *
     * Resets `isVisible` to false, triggering the fade-out animation.
     * Does NOT clear `message` or `type` immediately to allow the fade-out
     * animation to complete while still showing the previous content.
     */
    hideToast(state) {
      state.isVisible = false;
    },
  },
});

export const {showToast, hideToast} = toastSlice.actions;
export default toastSlice.reducer;
