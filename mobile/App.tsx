/**
 * App.tsx
 * Root application component and bootstrap entry point.
 *
 * Responsibilities:
 *  1. Provides the Redux store to the component tree via <Provider>.
 *  2. Provides the NavigationContainer from @react-navigation/native.
 *  3. Provides GestureHandlerRootView from react-native-gesture-handler
 *     (required for Swipeable gesture detection on Android).
 *  4. Injects the store's dispatch function into the apiClient module
 *     (resolving the circular import pattern for the 401 interceptor).
 *  5. Initializes the Firebase auth listener to restore sessions on launch.
 *  6. Initializes the AppState listener to re-fetch tasks on foreground transitions.
 *  7. Renders the AuthGuard to conditionally render either:
 *     - AuthStack (unauthenticated users: Login, Register)
 *     - AppDrawer (authenticated users: Dashboard, AddTask, Drawer)
 *
 * CONSTITUTION COMPLIANCE:
 * - All Redux state management flows through the store; App.tsx is presentational.
 * - Navigation structure uses React Navigation (no third-party UI libraries).
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { injectStore } from './src/services/apiClient';
import { initializeAuthListener } from './src/store/slices/authSlice';
import { initializeAppStateListener } from './src/store/slices/taskSlice';
import AuthGuard from './src/components/AuthGuard';
import AuthStack from './src/navigation/AuthStack';
import AppDrawer from './src/navigation/AppDrawer';
import { COLORS } from './src/utils/theme';

// Inject the Redux store's dispatch into the apiClient immediately at startup.
// This must happen before any API calls are made so the 401 interceptor
// can dispatch `clearAuthState` without a circular import.
injectStore(store.dispatch);

// =============================================================================
// Root App Wrapper (Handles Listeners)
// =============================================================================

/**
 * AppContent
 * The inner component rendered inside the Redux Provider and NavigationContainer.
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

  return (
    <>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      {/* AuthGuard reads isAuthenticated from Redux and routes accordingly (T014) */}
      <AuthGuard
        authenticatedChildren={<AppDrawer />}
        unauthenticatedChildren={<AuthStack />}
      />
    </>
  );
}

// =============================================================================
// Root App Component
// =============================================================================

/**
 * App
 * The outermost component wrapping the app with:
 * - GestureHandlerRootView: REQUIRED by react-native-gesture-handler for swipe gestures.
 * - Provider: Redux store provider.
 * - NavigationContainer: Required root for all React Navigation stacks/drawers.
 */
function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
