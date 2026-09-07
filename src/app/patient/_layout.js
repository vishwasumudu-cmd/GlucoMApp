import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function PatientLayout() {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
      },
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1.5,
        height: 64,
        paddingBottom: 6,
        paddingTop: 6,
      },
      headerStyle: {
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        borderBottomWidth: 1.5,
      },
      headerTitleStyle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.3,
      },
      headerTintColor: colors.text,
    }}>
      <Tabs.Screen 
        name="dashboard" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
          headerTitle: 'Patient Dashboard',
        }} 
      />
      <Tabs.Screen 
        name="analytics" 
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "analytics" : "analytics-outline"} size={size} color={color} />
          ),
          headerTitle: 'Glucose Trends',
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
          headerTitle: 'Health QR Profile',
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
          headerTitle: 'App Settings',
        }} 
      />
      
      {/* Hidden screen for alarm scheduling, navigated to via Router links */}
      <Tabs.Screen 
        name="notifications" 
        options={{
          title: 'Reminders',
          href: null,
          headerTitle: 'Setup Daily Reminders',
          // Show header back button so user can easily return to Settings/Dashboard
          headerShown: true,
        }} 
      />

      {/* Hidden screen — full-screen glucose test flow, launched from Dashboard TEST button */}
      <Tabs.Screen
        name="glucose-test"
        options={{
          href: null,          // Hide from tab bar
          headerShown: false,  // The screen manages its own header / back button
          tabBarStyle: { display: 'none' }, // Remove tab bar while on this screen
        }}
      />
    </Tabs>
  );
}
