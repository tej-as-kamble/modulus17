/**
 * index.js
 * Application entry point.
 *
 * Responsibilities:
 *  - Import @react-native-firebase/app to trigger native Firebase initialization
 *    on app startup (FR-009 / SC-005 / T017).
 *    The @react-native-firebase/app module reads configuration from the native
 *    google-services.json (Android) file automatically — no JS-level secrets required.
 *  - Register the root App component with the React Native AppRegistry.
 *
 * NOTE: @react-native-firebase/app MUST be imported before any other Firebase
 * module to ensure the native SDK is initialized first.
 */

/**
 * @format
 */

// Import Firebase app to trigger native initialization (T017)
// Configuration is read from android/app/google-services.json (native layer)
import '@react-native-firebase/app';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
