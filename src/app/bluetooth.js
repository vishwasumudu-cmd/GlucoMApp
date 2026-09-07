import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useBluetooth } from '../context/BluetoothContext';
import { useRouter } from 'expo-router';

export default function BluetoothScreen() {
  const { status, isConnected, lastRawValue, lastReadingAt } = useBluetooth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Connection</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, isConnected && styles.connected]}>
          {status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Last Reading:</Text>
        {lastRawValue ? (
          <>
            <Text style={styles.glucose}>{lastRawValue} mg/dL</Text>
            <Text style={styles.time}>
              {new Date(lastReadingAt).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.value}>Waiting for data...</Text>
        )}
      </View>

      {(!isConnected && status === "Scanning") && (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
  },
  connected: {
    color: '#34C759',
  },
  glucose: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  time: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  loader: {
    marginVertical: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
