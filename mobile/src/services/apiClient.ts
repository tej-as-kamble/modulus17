/**
 * services/apiClient.ts
 * The centralized Axios HTTP client for all backend API communication.
 *
 * This module creates and configures the single Axios instance used throughout
 * the application. It attaches interceptors for:
 *  1. Request Interceptor: Automatically retrieves and attaches the Firebase
 *     JWT to every outbound request's Authorization header.
 *  2. Response Interceptor: Centralizes error logging and handles specific
 *     HTTP errors (e.g., 401 token expiry/revocation).
 *
 * The 401 handler logic requires a reference to the Redux store dispatch to
 * clear auth state. To avoid circular imports (store → slice → apiClient → store),
 * the store is injected lazily at runtime via the `injectStore` function.
 * This is the standard Redux Toolkit pattern for this scenario.
 */

import axios from 'axios';
import {getAuth, signOut as firebaseSignOut} from '@react-native-firebase/auth';
import Config from 'react-native-config';
import type {AppDispatch} from '../store';

// =============================================================================
// Store Injection (Circular Import Prevention)
// =============================================================================

/**
 * A lazily-injected reference to the Redux store's dispatch function.
 * Initialized by calling `injectStore(store.dispatch)` in the app's entry
 * point (e.g., App.tsx or store/index.ts) after the store is created.
 */
let dispatch: AppDispatch | undefined;

/**
 * injectStore
 * Injects the Redux store's dispatch function into this module at runtime.
 * Must be called once at app startup before any API requests are made.
 *
 * @param storeDispatch - The `dispatch` function from the configured Redux store.
 */
export const injectStore = (storeDispatch: AppDispatch): void => {
  dispatch = storeDispatch;
};

// =============================================================================
// Axios Instance Initialization
// =============================================================================

/**
 * The base Axios instance for all API requests.
 * The base URL is read from the `API_URL` environment variable via react-native-config.
 */
const apiClient = axios.create({
  baseURL: Config.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// Request Interceptor
// =============================================================================

/**
 * Request Interceptor — Attach Firebase JWT to every request.
 *
 * Before each outbound request is dispatched, this interceptor:
 * 1. Checks if a Firebase user is currently signed in.
 * 2. If so, retrieves a fresh JWT ID token (Firebase handles caching and
 *    auto-refresh internally, so this is always a valid, non-expired token).
 * 3. Attaches the token to the `Authorization` header as a Bearer token.
 *
 * If no user is signed in (e.g., unauthenticated requests), the request
 * proceeds without an Authorization header.
 */
apiClient.interceptors.request.use(
  async config => {
    try {
      // Retrieve the current Firebase user. Returns null if not signed in.
      const currentUser = getAuth().currentUser;

      if (currentUser) {
        // `getIdToken()` returns a cached token or fetches a fresh one if expired.
        // Passing `true` would force a refresh; `false` (default) is sufficient.
        const token = await currentUser.getIdToken();

        // Attach the token as a Bearer token in the Authorization header.
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (tokenError) {
      // Log token retrieval failures, but do not block the request.
      // The backend will reject requests without a valid token with a 401.
      console.error('[apiClient] Failed to retrieve Firebase ID token:', tokenError);
    }

    return config;
  },
  error => {
    // A request config error is rare but should be propagated immediately.
    return Promise.reject(error);
  },
);

// =============================================================================
// Response Interceptor
// =============================================================================

/**
 * Response Interceptor — Centralized error handling.
 *
 * On a successful response (2xx), the response is passed through unchanged.
 *
 * On an error response, this interceptor:
 * 1. Logs the error centrally for debugging.
 * 2. Handles the 401 Unauthorized case specifically:
 *    - A 401 indicates the user's token has been expired or revoked externally.
 *    - The interceptor immediately signs the user out of Firebase.
 *    - It dispatches the `clearAuthState` action to reset the Redux auth state,
 *      which will cause the AuthGuard to redirect the user to the login screen.
 * 3. Re-rejects the error so that individual thunks can also handle it in their
 *    own `rejected` case and update the UI accordingly.
 */
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;

    // Centralized error logging for all API errors.
    console.error(
      `[apiClient] API Error: ${status} — ${error.response?.data?.message || error.message}`,
    );

    if (status === 401) {
      // --- 401 Unauthorized: Token expired or revoked ---
      // This is a critical state: the backend rejected the user's token.
      // We must immediately sign the user out and clear all auth state.
      console.warn('[apiClient] 401 received — clearing auth state and signing out.');

      try {
        // Sign out of Firebase to invalidate the client-side session.
        await firebaseSignOut(getAuth());
      } catch (signOutError) {
        console.error('[apiClient] Firebase sign-out failed after 401:', signOutError);
      }

      // Dispatch to Redux to clear auth state. This triggers the AuthGuard
      // to redirect the user to the login screen.
      if (dispatch) {
        // Dynamic import to avoid circular dependency at module load time.
        const {clearAuthState} = await import('../store/slices/authSlice');
        dispatch(clearAuthState());
      }
    }

    // Re-reject so calling thunks can handle the error in their own `catch` blocks.
    return Promise.reject(error);
  },
);

export default apiClient;
