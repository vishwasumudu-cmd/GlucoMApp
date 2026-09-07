import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  subscribeAuthState 
} from '../firebase/firebaseService';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme as RNUseColorScheme } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const systemColorScheme = RNUseColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  // Load theme and session settings on boot
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Load Dark Mode Preference
        const savedTheme = await SecureStore.getItemAsync('glucometer_theme');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (e) {
        console.warn("AuthContext Bootstrapping failed:", e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, [systemColorScheme]);

  // Subscribe to auth state updates (real firebase or mock local state)
  useEffect(() => {
    const unsubscribe = subscribeAuthState((currUser) => {
      setUser(currUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userData = await loginUser(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password, role) => {
    setLoading(true);
    try {
      const userData = await registerUser(fullName, email, password, role);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      await SecureStore.setItemAsync('glucometer_theme', nextMode ? 'dark' : 'light');
    } catch (_e) {
      // Fail silently
    }
  };

  const themeColors = {
    primary: '#C1121F', // Medical Blood Red
    primaryDark: '#780000', // Dark Crimson
    primaryGradient: ['#C1121F', '#780000'],
    
    // Light Mode Theme Colors
    light: {
      background: '#F8F9FA',
      card: '#FFFFFF',
      text: '#1E1E24',
      textSecondary: '#6C757D',
      border: '#E9ECEF',
      cardGlass: 'rgba(255, 255, 255, 0.85)',
      statusNormal: '#2A9D8F', // Balanced green
      statusWarning: '#E9C46A', // Warm yellow
      statusDanger: '#E76F51', // Soft coral red
      shadow: '#C8D3E0'
    },
    
    // Dark Mode Theme Colors
    dark: {
      background: '#0F0F12',
      card: '#16161D',
      text: '#F5F5F7',
      textSecondary: '#A0A0A5',
      border: '#2A2A35',
      cardGlass: 'rgba(22, 22, 29, 0.85)',
      statusNormal: '#2DCD91',
      statusWarning: '#FFC72C',
      statusDanger: '#FF4D4D',
      shadow: '#000000'
    }
  };

  // Select color set based on active selection
  const colors = isDarkMode ? themeColors.dark : themeColors.light;
  
  // Expose colors and primary gradient handles directly
  const activeTheme = {
    isDarkMode,
    toggleTheme,
    colors: {
      ...colors,
      primary: themeColors.primary,
      primaryDark: themeColors.primaryDark,
      primaryGradient: themeColors.primaryGradient
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, activeTheme }}>
      {children}
    </AuthContext.Provider>
  );
};
