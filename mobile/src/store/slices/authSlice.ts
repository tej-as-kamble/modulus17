/**
 * store/slices/authSlice.ts
 * Redux slice managing the user authentication state.
 *
 * This slice handles:
 *  1. User Registration: Creates a Firebase account, syncs with backend.
 *     Rolls back Firebase auth if backend sync fails (atomic behavior).
 *  2. User Login: Signs in via Firebase, syncs with backend.
 *     Rolls back Firebase auth if backend sync fails.
 *  3. User Logout: Signs out from Firebase and clears all local state.
 *  4. Session Restoration: Listens to Firebase's onAuthStateChanged event
 *     to automatically restore the session on app launch.
 *  5. Auth State Reset: An action for the API client's 401 interceptor to
 *     immediately clear auth state on token expiry/revocation.
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {AuthState, UserProfile} from '../../types';
import {registerUser, loginUser, logoutUser} from '../../services/authService';
import apiClient from '../../services/apiClient';
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import type {User} from '@react-native-firebase/auth';

// =============================================================================
// Initial State
// =============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true: we check for an existing session on launch
  error: null,
};

// =============================================================================
// Async Thunks
// =============================================================================

/**
 * registerAndSync
 * Thunk for new user registration. This is a multi-step, atomic operation:
 *
 * Step 1: Create a new Firebase account using email and password.
 * Step 2: Call the backend `/api/users/sync` endpoint to create the user's
 *         MongoDB profile. The apiClient interceptor automatically attaches
 *         the Firebase JWT from the newly created credential.
 *
 * ROLLBACK LOGIC: If Step 2 fails (backend sync error), the user would be
 * authenticated in Firebase but lack a backend profile, causing all subsequent
 * task API calls to fail. To prevent this partial state, we catch the error,
 * immediately sign the user out of Firebase, and re-throw to mark this thunk
 * as rejected. The user is effectively unregistered.
 */
export const registerAndSync = createAsyncThunk<
  UserProfile,
  {email: string; password: string}
>(
  'auth/registerAndSync',
  async ({email, password}, {rejectWithValue}) => {
    let firebaseCredential;

    try {
      // Step 1: Create the Firebase account.
      firebaseCredential = await registerUser(email, password);
    } catch (firebaseError: any) {
      // Firebase registration failed (e.g., email-already-in-use).
      // No rollback needed as no account was created.
      return rejectWithValue(firebaseError.message || 'Registration failed.');
    }

    try {
      // Step 2: Sync the new user's profile with our MongoDB backend.
      // The apiClient's request interceptor retrieves and attaches the
      // Firebase JWT automatically for this call.
      await apiClient.post('/api/users/sync');
    } catch (syncError: any) {
      // --- ROLLBACK ---
      // Backend sync failed. The user now exists in Firebase but NOT in our DB.
      // We MUST roll back by signing out of Firebase to prevent a partial auth state
      // where the user is "logged in" but all API calls would fail.
      console.error(
        '[authSlice] Backend sync failed after Firebase registration. Rolling back...',
        syncError,
      );
      await firebaseSignOut(getAuth());

      return rejectWithValue(
        'Account created but profile sync failed. Please try again.',
      );
    }

    // Both steps succeeded. Return the user profile to store in Redux state.
    return {
      uid: firebaseCredential.user.uid,
      email: firebaseCredential.user.email,
    };
  },
);

/**
 * loginAndSync
 * Thunk for existing user login. Also a multi-step, atomic operation:
 *
 * Step 1: Sign in via Firebase with email and password.
 * Step 2: Call the backend `/api/users/sync` to ensure the user's backend
 *         profile is current (handles cases where profile was deleted/recreated).
 *
 * ROLLBACK LOGIC: If Step 2 fails, the user would be authenticated in Firebase
 * but the backend cannot validate their profile. We sign them out of Firebase
 * and reject the thunk to prevent a broken authenticated state.
 */
export const loginAndSync = createAsyncThunk<
  UserProfile,
  {email: string; password: string}
>(
  'auth/loginAndSync',
  async ({email, password}, {rejectWithValue}) => {
    let firebaseCredential;

    try {
      // Step 1: Sign into Firebase.
      firebaseCredential = await loginUser(email, password);
    } catch (firebaseError: any) {
      // Firebase login failed (e.g., wrong-password, user-not-found).
      return rejectWithValue(firebaseError.message || 'Login failed.');
    }

    try {
      // Step 2: Sync with backend to confirm/update the MongoDB profile.
      await apiClient.post('/api/users/sync');
    } catch (syncError: any) {
      // --- ROLLBACK ---
      // Backend sync failed after successful Firebase login.
      // Sign out of Firebase to prevent an inconsistent authenticated state.
      console.error(
        '[authSlice] Backend sync failed after Firebase login. Rolling back...',
        syncError,
      );
      await firebaseSignOut(getAuth());

      return rejectWithValue(
        'Login succeeded but profile sync failed. Please try again.',
      );
    }

    // Both steps succeeded. Return the user profile.
    return {
      uid: firebaseCredential.user.uid,
      email: firebaseCredential.user.email,
    };
  },
);

/**
 * logout
 * Thunk for signing out the current user.
 *
 * Signs out from Firebase (invalidating the session token on the device)
 * and then the slice's reducer clears all Redux auth state.
 */
export const logout = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, {rejectWithValue}) => {
    try {
      await logoutUser();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed.');
    }
  },
);

// =============================================================================
// Slice Definition
// =============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * setUser
     * Synchronous action used by the Firebase `onAuthStateChanged` listener
     * (see `initializeAuthListener` below) to restore the user session on
     * app launch or reflect sign-in/sign-out events from the Firebase SDK.
     */
    setUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.isLoading = false; // Session check is complete
      state.error = null;
    },

    /**
     * clearAuthState
     * Synchronous action used by the apiClient's 401 response interceptor
     * to immediately reset the authentication state when a token expiry or
     * revocation is detected by the backend. The AuthGuard component will
     * react to `isAuthenticated: false` and redirect to the login screen.
     */
    clearAuthState(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = 'Your session has expired. Please log in again.';
    },
  },
  extraReducers: builder => {
    // --- registerAndSync ---
    builder.addCase(registerAndSync.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      registerAndSync.fulfilled,
      (state, action: PayloadAction<UserProfile>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        // Edge Case 7: Registration success toast
      },
    );
    builder.addCase(registerAndSync.rejected, (state, action) => {
      state.isLoading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.payload as string;
      // Edge Case 8: Registration failure toast
    });

    // --- loginAndSync ---
    builder.addCase(loginAndSync.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      loginAndSync.fulfilled,
      (state, action: PayloadAction<UserProfile>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        // Edge Case 9: Login success toast
      },
    );
    builder.addCase(loginAndSync.rejected, (state, action) => {
      state.isLoading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.payload as string;
      // Edge Case 10: Login failure toast
    });

    // --- logout ---
    builder.addCase(logout.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(logout.fulfilled, state => {
      // Clear all user data on successful logout.
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(logout.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const {setUser, clearAuthState} = authSlice.actions;
export default authSlice.reducer;

// =============================================================================
// Session Restoration Listener (T011)
// =============================================================================

/**
 * initializeAuthListener
 * Sets up a Firebase `onAuthStateChanged` listener to restore the user
 * session on application launch and react to sign-in/sign-out events.
 *
 * HOW IT WORKS:
 * - Firebase persists auth state across app restarts.
 * - On app launch, `onAuthStateChanged` fires once immediately with the
 *   currently signed-in user (if any) or `null` (if no session).
 * - The `setUser` action synchronously updates Redux state based on this,
 *   which triggers the AuthGuard to render the correct screen.
 * - We set `isLoading: true` in `initialState` so the app shows a splash/
 *   loading screen until this listener fires the first time.
 *
 * @param dispatch - The Redux store's dispatch function.
 * @returns        - An unsubscribe function to detach the listener on cleanup.
 */
export const initializeAuthListener = (
  dispatch: (action: ReturnType<typeof setUser>) => void,
): (() => void) => {
  const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser: User | null) => {
    if (firebaseUser) {
      // User is signed in: update Redux with their profile.
      dispatch(
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        }),
      );
    } else {
      // No user signed in: clear Redux auth state.
      dispatch(setUser(null));
    }
  });

  // Return the unsubscribe function so callers can clean up the listener.
  return unsubscribe;
};
