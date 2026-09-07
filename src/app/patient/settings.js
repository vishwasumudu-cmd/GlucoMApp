import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Switch, 
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';

export default function SettingsScreen() {
  const { logout, activeTheme, user } = useAuth();
  const { colors, isDarkMode, toggleTheme } = activeTheme;
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (e) {
      console.warn("Logout failed:", e);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. App Styling Block */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Appearance</Text>
      <Card style={styles.settingsCard} noPadding>
        <View style={styles.settingsRow}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(100,100,255,0.1)' }]}>
              <Ionicons name="moon-outline" size={20} color="#6666FF" />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode Theme</Text>
          </View>
          <Switch 
            value={isDarkMode} 
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* 2. Device Alarms configuration */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Telemetry & Reminders</Text>
      <Card style={styles.settingsCard} noPadding>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push('/patient/notifications')}
          style={[styles.settingsRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(193,18,31,0.1)' }]}>
              <Ionicons name="alarm-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily Check Alarms</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.settingsRow}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(45,205,145,0.1)' }]}>
              <Ionicons name="pulse-outline" size={20} color={colors.statusNormal} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Auto-Save Glucose logs</Text>
          </View>
          <Text style={[styles.rowValText, { color: colors.statusNormal }]}>Always Enabled</Text>
        </View>
      </Card>

      {/* 3. Account Session control */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Control</Text>
      <Card style={styles.settingsCard} noPadding>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={handleLogout}
          style={styles.settingsRow}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(255,77,77,0.1)' }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.statusDanger} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.statusDanger, fontWeight: '700' }]}>Sign Out Session</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={colors.statusDanger} />
        </TouchableOpacity>
      </Card>

      {/* Diagnostic version label */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>GlucoMeter App v1.0.0 (Production Sandbox)</Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Logged In: {user?.fullName}</Text>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 6,
  },
  settingsCard: {
    marginVertical: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowValText: {
    fontSize: 13,
    fontWeight: '700',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 36,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    marginVertical: 2,
  }
});
