import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.7;

export default function QRScannerScreen() {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Animated laser scan line Y offset
  const laserY = useSharedValue(-SCANNER_SIZE / 2);

  useEffect(() => {
    laserY.value = withRepeat(
      withSequence(
        withTiming(SCANNER_SIZE / 2, { duration: 1500, easing: Easing.ease }),
        withTiming(-SCANNER_SIZE / 2, { duration: 1500, easing: Easing.ease })
      ),
      -1, // Infinite loop
      true
    );
  }, [laserY]);

  const laserStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: laserY.value }],
    };
  });

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Validate barcode value (expecting patient ID, e.g. "GLU-PT-XXXXXX")
    if (data && data.startsWith('GLU-PT-')) {
      router.replace(`/doctor/patient-details?patientId=${data}`);
    } else {
      Alert.alert(
        "Invalid Code",
        `Scanned payload "${data}" is not a recognized GlucoMeter Patient ID. Please scan a valid ID card.`,
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    }
  };

  // Simulated scan for Web / Simulator environments
  const triggerMockScan = (patientId) => {
    setScanned(true);
    router.replace(`/doctor/patient-details?patientId=${patientId}`);
  };

  // Permission checks loading state
  if (!permission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Permission denied view layout
  if (!permission.granted && Platform.OS !== 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', padding: 24 }]}>
        <Card style={styles.permissionCard}>
          <View style={styles.permissionContent}>
            <Ionicons name="camera-outline" size={64} color={colors.primary} />
            <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Required</Text>
            <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
              We need permission to access your device&apos;s camera to scan patient ID card barcodes.
            </Text>
            <Button
              title="Grant Camera Access"
              onPress={requestPermission}
              style={styles.grantBtn}
            />
            <Button
              title="Simulate Sandbox Scan"
              onPress={() => triggerMockScan('GLU-PT-123456')}
              variant="secondary"
              style={styles.cancelBtn}
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* 1. Camera Viewfinder */}
      {Platform.OS === 'web' ? (
        // Web camera simulator screen
        <View style={styles.webSimulator}>
          <Ionicons name="desktop-outline" size={64} color={colors.primary} />
          <Text style={styles.webSimText}>Camera Stream Simulator</Text>
          <Text style={styles.webSimSub}>
            Scanning is simulated in browser builds. Use the fast shortcut below to test the patient details telemetry dashboard.
          </Text>
          
          <Button
            title="Simulate Scan: Sarah Connor (GLU-PT-123456)"
            onPress={() => triggerMockScan('GLU-PT-123456')}
            style={styles.simWebBtn}
          />
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Cancel Scanner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Native device camera screen
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        >
          {/* Overlay Box viewfinders */}
          <View style={styles.overlay}>
            <View style={styles.unfocusedZone} />
            <View style={styles.middleRow}>
              <View style={styles.unfocusedZone} />
              
              {/* Scan box viewport */}
              <View style={[styles.focusBox, { borderColor: colors.primary }]}>
                {/* Visual Laser Line */}
                <Animated.View style={[
                  styles.laserLine, 
                  { backgroundColor: colors.primary },
                  laserStyle
                ]} />
                
                {/* Viewfinder brackets */}
                <View style={[styles.bracket, styles.topLeft, { borderColor: colors.primary }]} />
                <View style={[styles.bracket, styles.topRight, { borderColor: colors.primary }]} />
                <View style={[styles.bracket, styles.bottomLeft, { borderColor: colors.primary }]} />
                <View style={[styles.bracket, styles.bottomRight, { borderColor: colors.primary }]} />
              </View>

              <View style={styles.unfocusedZone} />
            </View>
            <View style={styles.unfocusedZone}>
              <Text style={styles.helpText}>Align the patient QR Code within the brackets to scan</Text>
              
              {/* Allow mock override testing on native device as well */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => triggerMockScan('GLU-PT-123456')}
                style={styles.nativeMockBtn}
              >
                <Text style={styles.nativeMockText}>Simulate Test Scan (Sarah Connor)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    paddingVertical: 10,
  },
  permissionContent: {
    alignItems: 'center',
    padding: 16,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  permDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 20,
  },
  grantBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
  webSimulator: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1E1E24',
  },
  webSimText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  webSimSub: {
    color: '#A0A0A5',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  simWebBtn: {
    width: '100%',
    maxWidth: 320,
  },
  backLink: {
    padding: 12,
    marginTop: 10,
  },
  overlay: {
    flex: 1,
    flexDirection: 'column',
  },
  unfocusedZone: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  focusBox: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  laserLine: {
    width: SCANNER_SIZE - 20,
    height: 3,
    shadowColor: '#C1121F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    position: 'absolute',
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  helpText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  nativeMockBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  nativeMockText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  }
});
