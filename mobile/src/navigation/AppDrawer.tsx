/**
 * navigation/AppDrawer.tsx
 * The main application side-drawer navigation structure.
 *
 * Contains a custom Neumorphic drawer content component showing:
 * - User profile information (email, avatar initial)
 * - App settings (placeholder)
 * - Secure Logout button
 *
 * The drawer wraps the main App Stack (DashboardScreen, AddTaskScreen),
 * accessible via the hamburger menu on the Dashboard header.
 */

import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import DashboardScreen from '../screens/DashboardScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import {
  COLORS,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  NEO_SHADOW_RAISED,
} from '../utils/theme';

// =============================================================================
// Route Parameter Types
// =============================================================================

/**
 * AppDrawerParamList
 * Screens accessible via the side drawer.
 * Only 'MainStack' is a top-level drawer item — AddTask is nested inside it.
 */
export type AppDrawerParamList = {
  MainStack: undefined;
};

/**
 * AppStackParamList
 * Screens in the main nested stack navigator inside the drawer.
 */
export type AppStackParamList = {
  Dashboard: undefined;
  AddTask: undefined;
};

// =============================================================================
// Custom Drawer Content Component
// =============================================================================

/**
 * CustomDrawerContent
 * The full Neumorphic custom drawer panel rendered on the left side of the screen.
 * Replaces the default drawer navigation menu.
 */
const CustomDrawerContent: React.FC<DrawerContentComponentProps> = props => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);

  /**
   * handleLogout
   * Dispatches the logout thunk, which signs out of Firebase and clears Redux state.
   * The AuthGuard then renders the AuthStack automatically.
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ],
    );
  };

  // Derive the user's avatar initial from their email.
  const avatarInitial = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContent}>

      {/* User Profile Section */}
      <View style={styles.profileSection}>
        {/* Avatar Circle */}
        <View style={[styles.avatar, NEO_SHADOW_RAISED]}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {user?.email ?? 'Unknown User'}
        </Text>
        <Text style={styles.profileSubtext}>Signed in via Firebase</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Navigation Items */}
      <View style={styles.menuSection}>
        {/* Dashboard Link */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // Close the drawer and stay on the current Dashboard screen
            props.navigation.closeDrawer();
          }}>
          <Text style={styles.menuIcon}>🏠</Text>
          <Text style={styles.menuLabel}>Dashboard</Text>
        </TouchableOpacity>

        {/* Settings (Placeholder) */}
        <TouchableOpacity style={[styles.menuItem, styles.menuItemDisabled]}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={[styles.menuLabel, styles.menuLabelDisabled]}>
            Settings
          </Text>
          <Text style={styles.comingSoon}>Soon</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutLabel}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

// =============================================================================
// App Stack (nested inside Drawer)
// =============================================================================

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * AppStack
 * The nested stack navigator containing Dashboard and AddTask screens.
 * This is embedded inside the drawer navigator as the single drawer item.
 */
const AppStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // The DashboardScreen renders its own custom header
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddTask" component={AddTaskScreen} />
    </Stack.Navigator>
  );
};

// =============================================================================
// App Drawer Navigator
// =============================================================================

const Drawer = createDrawerNavigator<AppDrawerParamList>();

/**
 * AppDrawer
 * The root navigation structure for authenticated users.
 * Wraps the AppStack with a side-drawer panel.
 */
const AppDrawer: React.FC = () => {
  return (
    <Drawer.Navigator
      initialRouteName="MainStack"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // Header is managed within each screen
        drawerStyle: styles.drawerPanel,
        drawerType: 'slide', // Smooth slide-in animation
        overlayColor: 'rgba(55, 65, 81, 0.5)', // Semi-transparent overlay
        swipeEdgeWidth: 40, // Allow swipe from the left edge to open drawer
      }}>
      <Drawer.Screen name="MainStack" component={AppStack} />
    </Drawer.Navigator>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 0,
  },
  drawerPanel: {
    backgroundColor: COLORS.background,
    width: '78%',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 16, // Extra top padding for notch/status bar
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  profileEmail: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  profileSubtext: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.shadowDark,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  menuSection: {
    paddingHorizontal: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  menuLabelDisabled: {
    color: COLORS.textSecondary,
  },
  comingSoon: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.shadowDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.danger + '15',
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  logoutIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.md,
  },
  logoutLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.danger,
  },
});

export default AppDrawer;
