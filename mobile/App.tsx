/**
 * App.tsx
 * Root application component.
 *
 * Phase 1 (Foundation): This is a minimal entry-point screen to validate the
 * Android build compiles and launches successfully (US2 / FR-006 / SC-002).
 *
 * Phase 2 (Navigation): This component will be replaced with the full
 * React Navigation stack, connecting auth screens and the main task dashboard.
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.content}>
        <Text style={styles.title}>To-Do App</Text>
        <Text style={styles.subtitle}>Foundation infrastructure is ready.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default App;
