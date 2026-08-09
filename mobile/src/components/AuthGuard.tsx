/**
 * components/AuthGuard.tsx
 * A navigation guard component that routes users based on authentication state.
 *
 * This component subscribes to the Redux `auth` slice and conditionally renders
 * either the authenticated application screens or the public authentication screens.
 *
 * DESIGN:
 * - It renders a loading indicator while the Firebase session check is in progress
 *   (`isLoading: true` on first launch), preventing a flash of the wrong screen.
 * - Once the session check completes, it renders the correct child component tree
 *   based on `isAuthenticated`.
 * - This component is purely presentational — it does not embed business logic or
 *   API calls. It only reads Redux state and renders its children prop.
 *
 * USAGE:
 *   <AuthGuard
 *     authenticatedChildren={<AppScreens />}
 *     unauthenticatedChildren={<AuthScreens />}
 *   />
 */

import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useAppSelector} from '../store/hooks';

interface AuthGuardProps {
  /** The component tree to render for authenticated users (e.g., main app screens). */
  authenticatedChildren: React.ReactNode;
  /** The component tree to render for unauthenticated users (e.g., login/register screens). */
  unauthenticatedChildren: React.ReactNode;
}

/**
 * AuthGuard
 * Reads `isAuthenticated` and `isLoading` from the Redux auth slice.
 *
 * - `isLoading: true`   → Renders a centered loading spinner (session check in progress).
 * - `isAuthenticated`   → Renders `authenticatedChildren`.
 * - `!isAuthenticated`  → Renders `unauthenticatedChildren`.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  authenticatedChildren,
  unauthenticatedChildren,
}) => {
  // Read auth state from the Redux store via the typed selector hook.
  const {isAuthenticated, isLoading} = useAppSelector(state => state.auth);

  // While the Firebase `onAuthStateChanged` listener hasn't fired yet,
  // show a loading indicator to prevent a flash of the wrong screen.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Render the appropriate screen tree based on authentication status.
  return (
    <>{isAuthenticated ? authenticatedChildren : unauthenticatedChildren}</>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
  },
});

export default AuthGuard;
