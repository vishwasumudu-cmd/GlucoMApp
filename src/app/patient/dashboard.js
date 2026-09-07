import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { useBluetooth } from "../../context/BluetoothContext";
import {
  fetchPatientReadings,
  fetchReminderTime,
  saveReminderTime
} from "../../firebase/firebaseService";
import { getGlucoseStatus } from "../../utils/helpers";

export default function PatientDashboard() {
  const { user, activeTheme } = useAuth();
  const { colors, isDarkMode } = activeTheme || {
    colors: {
      background: "#FFF",
      text: "#000",
      primary: "#C1121F",
      border: "#DDD",
      textSecondary: "#666",
      card: "#FFF",
    },
    isDarkMode: false,
  };
  const router = useRouter();

  // Bluetooth Connection State - from global BluetoothContext (alive across all screens)
  const { status, isConnected, lastRawValue, lastReadingAt, startScan } = useBluetooth();

  // Core UI States
  const [glucose, setGlucose] = useState("--");
  const [currentReading, setCurrentReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 1. Firebase Data Fetching
  useEffect(() => {
    if (!user) return;
    const loadInitialData = async () => {
      setLoadingHistory(true);
      try {
        const readings = await fetchPatientReadings(user.uniqueId);
        setHistory(readings || []);
        if (readings && readings.length > 0) {
          setCurrentReading(readings[0]);
          setGlucose(readings[0].glucose);
        }
        const reminder = await fetchReminderTime(user.uniqueId);
        if (reminder && reminder.reminderTime) {
          const [time, modifier] = reminder.reminderTime.split(" ");
          let [hours, minutes] = time.split(":");
          if (hours === "12") hours = "00";
          if (modifier === "PM") hours = parseInt(hours, 10) + 12;
          const d = new Date();
          d.setHours(hours);
          d.setMinutes(minutes);
          setReminderTime(d);
        }
      } catch (err) {
        console.warn("Failed to load initial data:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadInitialData();
  }, [user]);

  // 2. Refresh history & glucose display whenever this screen gains focus.
  //    Runs after returning from the GlucoseTest screen so new saved readings
  //    appear immediately in the history list and share button.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const refresh = async () => {
        try {
          const readings = await fetchPatientReadings(user.uniqueId);
          setHistory(readings || []);
          if (readings && readings.length > 0) {
            setCurrentReading(readings[0]);
            setGlucose(readings[0].glucose);
          }
        } catch (err) {
          console.warn("Focus refresh failed:", err);
        }
      };
      refresh();
    }, [user]),
  );

  // Bluetooth logic lives in src/context/BluetoothContext.js (started at root layout level).

  // Navigate to the dedicated GlucoseTest screen.
  // All reading capture, display, and saving happens there.
  const handleTestGlucose = () => {
    if (!isConnected) return;
    router.push("/patient/glucose-test");
  };

  const handleTimeValueChange = async (event, selectedDate) => {
    if (event && event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }
    const currentDate = selectedDate || reminderTime;
    setShowTimePicker(Platform.OS === "ios");
    setReminderTime(currentDate);

    if (user) {
      // Format explicitly to "HH:MM AM/PM"
      let hours = currentDate.getHours();
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

      try {
        await saveReminderTime(user.uniqueId, formattedTime, true);
        console.log("Auto-saved reminder time:", formattedTime);
      } catch (err) {
        console.warn("Failed to auto-save reminder time:", err);
      }
    }
  };

  const handleTimeDismiss = () => {
    setShowTimePicker(false);
  };

  const shareReading = async () => {
    if (glucose === "--") return;
    try {
      await Share.share({
        message: `My GlucoMeter blood glucose reading is ${glucose} mg/dL checked at ${currentReading?.time || "now"}.`,
      });
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  // isConnected comes from useUSB() — true only after ESP32 handshake verified.
  // TEST is enabled as soon as connected; fresh reading captured on the test screen.
  const isReadyToTest = isConnected;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Card title="Hardware Link Status">
        <View style={styles.statusBannerRow}>
          <View
            style={[
              styles.statusDotIndicator,
              { backgroundColor: isConnected ? "#2DCD91" : status === "Scanning" || status === "Connecting" ? "#FFC72C" : "#C1121F" },
            ]}
          />
          <Text
            style={[
              styles.statusTextValue,
              { color: isConnected ? "#2DCD91" : status === "Scanning" || status === "Connecting" ? "#FFC72C" : colors.textSecondary },
            ]}
          >
            {status}
          </Text>
        </View>

        {/* Manual Connect Button — shows when not connected */}
        {!isConnected && (
          <TouchableOpacity
            style={[
              styles.connectBtn,
              {
                backgroundColor:
                  status === "Scanning" || status === "Connecting"
                    ? colors.card
                    : colors.primary,
                borderColor: colors.primary,
                opacity: status === "Scanning" || status === "Connecting" ? 0.7 : 1,
              },
            ]}
            onPress={startScan}
            disabled={status === "Scanning" || status === "Connecting"}
            activeOpacity={0.75}
          >
            {status === "Scanning" || status === "Connecting" ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="bluetooth" size={16} color="#FFF" />
            )}
            <Text
              style={[
                styles.connectBtnText,
                {
                  color:
                    status === "Scanning" || status === "Connecting"
                      ? colors.primary
                      : "#FFF",
                },
              ]}
            >
              {status === "Scanning"
                ? "Scanning…"
                : status === "Connecting"
                ? "Connecting…"
                : "Connect to Device"}
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      <View style={styles.centerInteractiveZone}>
        <TouchableOpacity
          style={[
            styles.largeCircleButton,
            {
              borderColor: isReadyToTest ? colors.primary : "#ccc",
              backgroundColor: isReadyToTest ? colors.primary : colors.card,
              opacity: isReadyToTest ? 1 : 0.5,
            },
          ]}
          onPress={handleTestGlucose}
          disabled={!isReadyToTest}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.testButtonText,
              { color: isReadyToTest ? "#FFFFFF" : "#ccc" },
            ]}
          >
            TEST
          </Text>
        </TouchableOpacity>

        {glucose !== "--" && (
          <TouchableOpacity
            onPress={shareReading}
            style={styles.shareMetricBtn}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.shareMetricText, { color: colors.primary }]}>
              Share Last Metrics Log ({glucose} mg/dL)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Card title="Glucose Check Reminder Alert">
        <View style={styles.timerRowContainer}>
          <View style={styles.timerLeftBox}>
            <View style={styles.alarmIconFrame}>
              <Ionicons name="alarm-outline" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.alarmConfigTitle, { color: colors.text }]}>
                Daily Test Schedule
              </Text>
              <Text
                style={[
                  styles.alarmConfigValue,
                  { color: colors.textSecondary },
                ]}
              >
                Scheduled for:{" "}
                {reminderTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editTimerChip, { borderColor: colors.primary }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={[styles.editTimerChipText, { color: colors.primary }]}>
              Change Time
            </Text>
          </TouchableOpacity>
        </View>
        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={false}
            display="default"
            onValueChange={handleTimeValueChange}
            onDismiss={handleTimeDismiss}
          />
        )}
      </Card>

      <Card title="Recent Checked History Log">
        {loadingHistory ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ margin: 20 }}
          />
        ) : history.length === 0 ? (
          <Text
            style={[styles.emptyHistoryMsg, { color: colors.textSecondary }]}
          >
            No historical records logged today.
          </Text>
        ) : (
          history.slice(0, 5).map((item, index) => {
            const rowHealthAnalysis = getGlucoseStatus(
              item.glucose,
              isDarkMode,
            );
            return (
              <View
                key={index}
                style={[
                  styles.historyLogItemLine,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth:
                      index === history.slice(0, 5).length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.historyItemLeftLayout}>
                  <View
                    style={[
                      styles.historyValueBadge,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyBadgeTextValue,
                        { color: colors.text },
                      ]}
                    >
                      {item.glucose}
                    </Text>
                  </View>
                  <View style={styles.historyMetaColumn}>
                    <Text
                      style={[
                        styles.historyStatusHeader,
                        { color: colors.text },
                      ]}
                    >
                      {rowHealthAnalysis?.status || "Normal"} Reading
                    </Text>
                    <Text
                      style={[
                        styles.historyTimeSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.time}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.historyDateTextBadge,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.date}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

// Styles එලෙසම පවතී...
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  statusDotIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusTextValue: { fontSize: 16, fontWeight: "700" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  connectBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  centerInteractiveZone: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  largeCircleButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  testButtonText: { fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  shareMetricBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 6,
  },
  shareMetricText: { fontSize: 13, fontWeight: "700", marginLeft: 6 },
  timerRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  timerLeftBox: { flexDirection: "row", alignItems: "center" },
  alarmIconFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(193, 18, 31, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alarmConfigTitle: { fontSize: 14, fontWeight: "700" },
  alarmConfigValue: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  editTimerChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editTimerChipText: { fontSize: 12, fontWeight: "700" },
  emptyHistoryMsg: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 20,
  },
  historyLogItemLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  historyItemLeftLayout: { flexDirection: "row", alignItems: "center" },
  historyValueBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  historyBadgeTextValue: { fontSize: 16, fontWeight: "800" },
  historyMetaColumn: { justifyContent: "center" },
  historyStatusHeader: { fontSize: 14, fontWeight: "700" },
  historyTimeSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  historyDateTextBadge: { fontSize: 12, fontWeight: "600" },
});
