import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Switch, 
  Alert,
  Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn("expo-notifications failed to load (probably running in Expo Go SDK 53+):", e.message);
  Notifications = {
    scheduleNotificationAsync: async () => 'mock-notification-id',
  };
}
import { useAuth } from '../../context/AuthContext';
import { saveReminderTime, fetchReminderTime } from '../../firebase/firebaseService';
import { NotificationService } from '../../services/notificationService';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function NotificationSettings() {
  const { user, activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [isEnabled, setIsEnabled] = useState(true);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load current reminder settings on mount
  useEffect(() => {
    if (!user) return;
    
    const loadReminder = async () => {
      try {
        const reminderObj = await fetchReminderTime(user.uniqueId);
        if (reminderObj) {
          setIsEnabled(reminderObj.enabled);
          
          // Parse time string e.g. "08:30 AM"
          const timeStr = reminderObj.reminderTime;
          const [time, modifier] = timeStr.split(' ');
          const [h, m] = time.split(':');
          
          setHour(h);
          setMinute(m);
          setPeriod(modifier);
        }
      } catch (err) {
        console.warn("Failed to load reminder settings:", err);
      }
    };

    loadReminder();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    const timeString = `${hour}:${minute} ${period}`;
    try {
      // 1. Save in database
      await saveReminderTime(user.uniqueId, timeString, isEnabled);
      
      // 2. Register with device notification manager
      if (isEnabled) {
        const scheduled = await NotificationService.scheduleDailyReminder(timeString);
        if (scheduled) {
          if (Platform.OS === 'web') {
            alert(`Reminder set for ${timeString}`);
          } else {
            Alert.alert("Alarm Configured", `Your daily reminder alarm has been set for ${timeString}.`);
          }
        } else {
          Alert.alert("Permission Error", "Notifications are blocked. Please enable permissions in system settings.");
        }
      } else {
        await NotificationService.cancelAllReminders();
        Alert.alert("Alarms Deactivated", "All daily checking reminders have been cancelled.");
      }
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update alarm settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Instantly test notifications by scheduling one to fire in 5 seconds!
  const handleTestAlarm = async () => {
    setTesting(true);
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Enable notifications first in settings.");
        setTesting(false);
        return;
      }

      if (Platform.OS === 'web') {
        alert("Local notifications test triggered! Will log reminder alarm mock.");
        console.log("[Notification Test] Triggering test alert in 5 seconds...");
        setTesting(false);
        return;
      }

      // Schedule a single notification to fire in 5 seconds
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🩸 GlucoMeter Sandbox Test",
          body: "This is a test notification verifying your alarm scheduler is functional!",
          sound: true,
        },
        trigger: {
          seconds: 5,
        },
      });

      Alert.alert("Test Triggered", "A test notification will fire in 5 seconds. Lock your screen or check your notification tray!");
    } catch (e) {
      console.error(e);
      Alert.alert("Test Failed", "Failed to run diagnostic notification.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Alarm Switch Card */}
      <Card title="Reminder Settings">
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Daily Glucose Check Reminder</Text>
            <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
              Receive a local push notification alert to remind you to log device readings.
            </Text>
          </View>
          <Switch 
            value={isEnabled} 
            onValueChange={setIsEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* 2. Time Pickers Selectors */}
      {isEnabled && (
        <Card title="Choose Alarm Time">
          <Text style={[styles.pickerHelp, { color: colors.textSecondary }]}>
            Set the target hour and minute you wish to take your measurements.
          </Text>

          <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
            {/* Hour Picker */}
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerHeader, { color: colors.textSecondary }]}>Hour</Text>
              <Picker
                selectedValue={hour}
                onValueChange={(itemValue) => setHour(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                  <Picker.Item key={h} label={h} value={h} color={colors.text} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerHeader, { color: colors.textSecondary }]}>Minute</Text>
              <Picker
                selectedValue={minute}
                onValueChange={(itemValue) => setMinute(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                  <Picker.Item key={m} label={m} value={m} color={colors.text} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>

            {/* Period Picker */}
            <View style={styles.pickerCol}>
              <Text style={[styles.pickerHeader, { color: colors.textSecondary }]}>Period</Text>
              <Picker
                selectedValue={period}
                onValueChange={(itemValue) => setPeriod(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="AM" value="AM" color={colors.text} style={styles.pickerItem} />
                <Picker.Item label="PM" value="PM" color={colors.text} style={styles.pickerItem} />
              </Picker>
            </View>
          </View>

          <View style={styles.selectedTimeContainer}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <Text style={[styles.selectedTimeText, { color: colors.text }]}>
              Selected Alarm: <Text style={{ fontWeight: '800', color: colors.primary }}>{hour}:{minute} {period}</Text>
            </Text>
          </View>
        </Card>
      )}

      {/* 3. Action Controls */}
      <View style={styles.btnCol}>
        <Button
          title="Save Alarm Time"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
        
        <Button
          title="Test Notification (5s Delay)"
          onPress={handleTestAlarm}
          loading={testing}
          variant="secondary"
          icon={<Ionicons name="sparkles" size={18} color={colors.primary} />}
          style={styles.testBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 0.8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  pickerHelp: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  pickerCol: {
    flex: 1,
  },
  pickerHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerItem: {
    fontSize: 15,
  },
  selectedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  selectedTimeText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  btnCol: {
    marginTop: 10,
  },
  saveBtn: {
    marginVertical: 6,
  },
  testBtn: {
    marginVertical: 6,
  }
});
