import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { AddLoanScreen } from '../screens/AddLoanScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, typography } from '../theme/theme';
import type { AuthStackParamList, MainTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

function AuthFlow(): React.JSX.Element {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

/** Plain text glyphs keep the bundle free of an icon font dependency. */
function tabIcon(glyph: string) {
  return function TabIcon({ color }: { color: string }): React.JSX.Element {
    return <Text style={[styles.tabIcon, { color }]}>{glyph}</Text>;
  };
}

function MainFlow(): React.JSX.Element {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { ...typography.caption, fontWeight: '600' },
      }}
    >
      <MainTabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('◉'),
          tabBarAccessibilityLabel: 'Dashboard',
        }}
      />
      <MainTabs.Screen
        name="Loans"
        component={LoansScreen}
        options={{
          title: 'Loans',
          tabBarIcon: tabIcon('≡'),
          tabBarAccessibilityLabel: 'All loans',
        }}
      />
      <MainTabs.Screen
        name="AddLoan"
        component={AddLoanScreen}
        options={{
          title: 'Add',
          tabBarIcon: tabIcon('+'),
          tabBarAccessibilityLabel: 'Add a loan',
        }}
      />
      <MainTabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: tabIcon('⚙'),
          tabBarAccessibilityLabel: 'Settings',
        }}
      />
    </MainTabs.Navigator>
  );
}

function SplashScreen(): React.JSX.Element {
  return (
    <View style={styles.splash}>
      <View style={styles.splashLogo}>
        <Text style={styles.splashLogoText}>₹</Text>
      </View>
      <Text style={styles.splashTitle}>MiniLedger</Text>
      <ActivityIndicator color={colors.primary} style={styles.splashSpinner} />
    </View>
  );
}

/**
 * Chooses the navigation tree based on the authentication state.
 *
 * The container is keyed by the auth status, so switching between the signed
 * out and the signed in trees always starts from a clean state.
 */
export function RootNavigator(): React.JSX.Element {
  const { status } = useAuth();

  if (status === 'loading') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer key={status} theme={navigationTheme}>
      {status === 'authenticated' ? <MainFlow /> : <AuthFlow />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  splashTitle: {
    ...typography.title,
    color: colors.text,
    marginTop: 16,
  },
  splashSpinner: {
    marginTop: 20,
  },
});
