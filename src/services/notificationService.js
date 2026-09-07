import { Platform } from 'react-native';

let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn("expo-notifications failed to load (probably running in Expo Go SDK 53+):", e.message);
  Notifications = {
    setNotificationHandler: () => {},
    AndroidNotificationPriority: { HIGH: 'high' },
    AndroidImportance: { HIGH: 5 },
    SchedulableTriggerInputTypes: { CALENDAR: 'calendar' },
    scheduleNotificationAsync: async () => 'mock-notification-id',
    cancelAllScheduledNotificationsAsync: async () => {},
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
  };
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  // Request system notification permissions
  requestPermissions: async () => {
    if (Platform.OS === 'web') return false;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted!');
        return false;
      }
      return true;
    } catch (e) {
      console.warn("Notification permission request failed:", e);
      return false;
    }
  },

  // Schedule daily reminder at specific time (e.g., "08:00 AM")
  scheduleDailyReminder: async (timeString) => {
    if (Platform.OS === 'web') {
      console.log(`[Notification Mock] Daily reminder scheduled for ${timeString}`);
      return true;
    }

    try {
      // 1. Request permission first
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) return false;

      // 2. Setup Android notification channel (required for Android 8+)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('glucose-reminders', {
          name: 'Glucose Check Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#C1121F',
          sound: 'default',
          enableVibrate: true,
        });
      }

      // 3. Clear previous scheduled reminders to avoid duplication
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 4. Parse Time (e.g., "08:30 AM")
      const [time, modifier] = timeString.split(' ');
      let [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (modifier === 'PM' && hours < 12) {
        hours = hours + 12;
      }
      if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }

      // 5. Schedule recurring daily notification (Expo SDK 56 CalendarTrigger format)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🩸 Blood Glucose Check Reminder",
          body: "It's time to check your blood glucose level with your GlucoMeter device!",
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority?.HIGH ?? 'high',
          ...(Platform.OS === 'android' && { channelId: 'glucose-reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar',
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(`Daily reminder scheduled successfully for ${hours}:${String(minutes).padStart(2, '0')}`);
      return true;
    } catch (error) {
      console.error("Failed to schedule reminder:", error);
      return false;
    }
  },

  // Clear all pending notification alarms
  cancelAllReminders: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notification alarms cancelled.");
    } catch (err) {
      console.error("Error cancelling notifications:", err);
    }
  }
};
