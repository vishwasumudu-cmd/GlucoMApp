import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const { user, loading, activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [animationCompleted, setAnimationCompleted] = useState(false);

  // Animation values
  const dropY = useSharedValue(-height / 2 - 50); // Start off-screen at the top
  const dropScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Blood drop falls from top to center
    dropY.value = withTiming(0, {
      duration: 1200,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    }, (finished) => {
      if (finished) {
        // 2. Teardrop morphs/expands and glow fades in
        dropScale.value = withTiming(15, { duration: 800, easing: Easing.out(Easing.ease) });
        glowOpacity.value = withTiming(0.7, { duration: 800 });
        
        // 3. Text fades in and scales up
        textOpacity.value = withDelay(200, withSpring(1, { damping: 12 }));
        textScale.value = withDelay(200, withSpring(1.1, { damping: 10 }, (done) => {
          if (done) {
            // Keep text at normal scale
            textScale.value = withSpring(1);
            // 4. Show loading spinner for auth check
            spinnerOpacity.value = withTiming(1, { duration: 400 });
            // Signal animation completion on main thread
            runOnJS(setAnimationCompleted)(true);
          }
        }));
      }
    });
  }, [dropScale, dropY, glowOpacity, spinnerOpacity, textOpacity, textScale]);

  // Handle routing once BOTH animation is completed and auth loading is done
  useEffect(() => {
    if (animationCompleted && !loading) {
      const routeUser = () => {
        if (!user) {
          router.replace('/login');
        } else if (user.role === 'Patient') {
          router.replace('/patient/dashboard');
        } else if (user.role === 'Doctor') {
          router.replace('/doctor/dashboard');
        } else {
          router.replace('/login'); // Default fallback
        }
      };

      // Slight delay for premium feel
      const timeout = setTimeout(routeUser, 800);
      return () => clearTimeout(timeout);
    }
  }, [animationCompleted, loading, user, router]);

  // Animated styles
  const dropStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: dropY.value },
        { scale: dropScale.value },
        // Teardrop shape rotation
        { rotate: '45deg' } 
      ],
      opacity: dropScale.value > 12 ? withTiming(0, { duration: 400 }) : 1
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: dropScale.value }]
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ scale: textScale.value }],
    };
  });

  const spinnerStyle = useAnimatedStyle(() => {
    return {
      opacity: spinnerOpacity.value
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Radial Glowing Circle */}
      <Animated.View style={[
        styles.radialGlow, 
        { backgroundColor: colors.primary }, 
        glowStyle
      ]} />

      {/* Realistic Teardrop Blood Drop */}
      <Animated.View style={[
        styles.bloodDrop, 
        { backgroundColor: colors.primary }, 
        dropStyle
      ]} />

      {/* Morphing Brand Header */}
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.title, { color: colors.text }, textStyle]}>
          GlucoMeter
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { color: colors.textSecondary }, textStyle]}>
          ESP32 telemetry dashboard
        </Animated.Text>
      </View>

      {/* Loader indicator before navigating */}
      <Animated.View style={[styles.spinner, spinnerStyle]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodDrop: {
    width: 24,
    height: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    position: 'absolute',
    shadowColor: '#C1121F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  radialGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'absolute',
    opacity: 0,
    // Radial glow blur simulator
    shadowColor: '#C1121F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(193, 18, 31, 0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  }
});
