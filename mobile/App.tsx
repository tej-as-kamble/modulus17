/**
 * App.tsx
 * Root application component and bootstrap entry point.
 *
 * Responsibilities:
 *  1. Provides the Redux store to the component tree via `<Provider>`.
 *  2. Injects the store's dispatch function into the apiClient module
 *     (resolving the circular import pattern for the 401 interceptor).
 *  3. Initializes the Firebase auth listener to restore sessions on launch.
 *  4. Initializes the AppState listener to re-fetch tasks on foreground transitions.
 *  5. Renders the `AuthGuard` to conditionally show auth or app screens.
 *
 * NOTE: Phase 2 (Navigation) will replace the placeholder screen children
 * with actual React Navigation stacks for auth and main app flows.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { store } from './src/store';
import { injectStore } from './src/services/apiClient';
import { initializeAuthListener } from './src/store/slices/authSlice';
import { initializeAppStateListener } from './src/store/slices/taskSlice';
import AuthGuard from './src/components/AuthGuard';

// Inject the Redux store's dispatch into the apiClient immediately at startup.
// This must happen before any API calls are made so the 401 interceptor
// can dispatch `clearAuthState` without a circular import.
injectStore(store.dispatch);

// =============================================================================
// Root App Wrapper (Handles Listeners)
// =============================================================================

/**
 * AppContent
 * The inner component rendered inside the Redux Provider.
 * Initializes Firebase auth and AppState listeners on mount.
 */
function AppContent(): React.JSX.Element {
  const dispatch = store.dispatch;

  useEffect(() => {
    // Initialize the Firebase auth state listener.
    // This fires immediately with the current auth state (restoring session on launch)
    // and continues listening for subsequent sign-in/sign-out events.
    const unsubscribeAuth = initializeAuthListener(dispatch);

    // Initialize the AppState listener for foreground data refreshes.
    // This will dispatch `fetchTasks` whenever the app returns to the foreground.
    const unsubscribeAppState = initializeAppStateListener(dispatch);

    // Cleanup: remove both listeners when the root component unmounts.
    return () => {
      unsubscribeAuth();
      unsubscribeAppState();
    };
  }, [dispatch]);

  // Placeholder children — to be replaced with React Navigation stacks in Phase 4.
  return (
    <AuthGuard
      authenticatedChildren={
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
          <View style={styles.content}>
            <Text style={styles.title}>To-Do App</Text>
            <Text style={styles.subtitle}>
              ✅ Data layer initialized. Navigation phase coming next.
            </Text>
          </View>
        </SafeAreaView>
      }
      unauthenticatedChildren={
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" />
          <View style={styles.content}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Please log in to continue.</Text>
          </View>
        </SafeAreaView>
      }
    />
  );
}

// =============================================================================
// Root App Component
// =============================================================================

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0B0',
    textAlign: 'center',
  },
});

export default App;
