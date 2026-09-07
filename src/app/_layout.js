import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { BluetoothProvider } from '../context/BluetoothContext';
import { StatusBar } from 'expo-status-bar';

function RootLayoutNav() {
  const { activeTheme } = useAuth();
  const { isDarkMode } = activeTheme;

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Splash / Auth Checker */}
        <Stack.Screen name="index" />
        
        {/* Bluetooth Connect */}
        <Stack.Screen name="bluetooth" options={{ presentation: 'modal' }} />
        
        {/* Auth Group */}
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        
        {/* Patient Dashboard Stack */}
        <Stack.Screen name="patient" />
        
        {/* Doctor Dashboard Stack */}
        <Stack.Screen name="doctor" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <BluetoothProvider>
        <RootLayoutNav />
      </BluetoothProvider>
    </AuthProvider>
  );
}
