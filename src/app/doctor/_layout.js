import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function DoctorLayout() {
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
            <Ionicons name={focused ? "medical" : "medical-outline"} size={size} color={color} />
          ),
          headerTitle: 'Doctor Dashboard',
        }} 
      />
      <Tabs.Screen 
        name="search" 
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
          headerTitle: 'Find Patient',
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
          headerTitle: 'Clinical Settings',
        }} 
      />
      
      {/* Hidden screen for QR scanning */}
      <Tabs.Screen 
        name="scanner" 
        options={{
          title: 'QR Scan',
          href: null,
          headerTitle: 'Scan Patient Health Card',
          headerShown: true,
        }} 
      />

      {/* Hidden screen for Patient Details report */}
      <Tabs.Screen 
        name="patient-details" 
        options={{
          title: 'Telemetry Report',
          href: null,
          headerTitle: 'Patient Telemetry Report',
          headerShown: true,
        }} 
      />
    </Tabs>
  );
}
