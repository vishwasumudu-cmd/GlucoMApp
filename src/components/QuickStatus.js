import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function QuickStatus({ connected = false }) {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;

  // Pulse animation for status dot
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 800, easing: Easing.ease }),
        withTiming(0.4, { duration: 800, easing: Easing.ease })
      ),
      -1, // Infinite repeat
      true
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: withTiming(opacity.value ? 1 + (opacity.value - 0.4) * 0.5 : 1) }
      ]
    };
  });

  const statusColor = connected ? colors.statusNormal : colors.statusDanger;
  const statusText = connected ? 'ESP32 Device Connected' : 'Waiting for Device...';
  const statusBg = connected ? 'rgba(45, 205, 145, 0.1)' : 'rgba(255, 77, 77, 0.1)';

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.cardGlass, 
        borderColor: colors.border,
        shadowColor: colors.shadow
      }
    ]}>
      <View style={styles.leftRow}>
        <View style={[styles.pulseContainer, { backgroundColor: statusBg }]}>
          <Animated.View style={[
            styles.dot, 
            { backgroundColor: statusColor },
            pulseStyle
          ]} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colors.text }]}>
            {statusText}
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            {connected ? 'Streaming live glucose telemetry' : 'Turn on your ESP32-S3 transmitter'}
          </Text>
        </View>
      </View>
      <Ionicons 
        name={connected ? 'bluetooth' : 'bluetooth-outline'} 
        size={24} 
        color={statusColor} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  }
});
