/**
 * services/authService.ts
 * Firebase Authentication wrappers for the React Native application.
 *
 * This module provides thin, typed wrapper functions around the Firebase
 * Auth SDK operations. Keeping Firebase SDK calls isolated here (rather than
 * directly in Redux thunks) ensures:
 *  - The Redux slice remains testable without mocking the Firebase SDK directly.
 *  - The auth mechanism can be swapped or mocked at a single point.
 */

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import type {UserCredential} from '@react-native-firebase/auth';

// =============================================================================
// Auth Wrapper Functions
// =============================================================================

/**
 * registerUser
 * Creates a new Firebase account using email and password.
 *
 * @param email    - The user's email address.
 * @param password - The user's chosen password (min 6 chars, enforced by Firebase).
 * @returns        - A FirebaseAuthTypes.UserCredential on success.
 * @throws         - Re-throws any Firebase auth error (e.g., auth/email-already-in-use).
 */
export const registerUser = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(getAuth(), email, password);
};

/**
 * loginUser
 * Signs in an existing Firebase user using email and password.
 *
 * @param email    - The user's registered email address.
 * @param password - The user's account password.
 * @returns        - A FirebaseAuthTypes.UserCredential on success.
 * @throws         - Re-throws any Firebase auth error (e.g., auth/wrong-password).
 */
export const loginUser = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(getAuth(), email, password);
};

/**
 * logoutUser
 * Signs out the currently authenticated Firebase user.
 *
 * Clears the Firebase-managed session token from the device.
 * Redux auth state is cleared separately by the calling thunk.
 *
 * @throws - Re-throws any Firebase sign-out error.
 */
export const logoutUser = async (): Promise<void> => {
  return firebaseSignOut(getAuth());
};
