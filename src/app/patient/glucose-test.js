/**
 * ============================================================
 * GlucoMApp — GlucoseTestScreen (glucose-test.js)
 * ============================================================
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useBluetooth } from "../../context/BluetoothContext";
import {
  fetchPatientReadings,
  saveGlucoseReading,
} from "../../firebase/firebaseService";

const WAIT_TIMEOUT_MS = 30_000;

const getGlucoseInfo = (value) => {
  if (value < 70)
    return {
      color: "#FF4D4D",
      bg: "rgba(255,77,77,0.12)",
      label: "Low — Hypoglycemia",
      icon: "arrow-down-circle",
      advice: "Consume fast-acting carbs immediately.",
    };
  if (value <= 99)
    return {
      color: "#2DCD91",
      bg: "rgba(45,205,145,0.12)",
      label: "Normal Range",
      icon: "checkmark-circle",
      advice: "Your glucose level is healthy.",
    };
  if (value <= 125)
    return {
      color: "#FFC72C",
      bg: "rgba(255,199,44,0.12)",
      label: "Pre-Diabetic Range",
      icon: "warning",
      advice: "Monitor diet and consult your doctor.",
    };
  if (value <= 200)
    return {
      color: "#FF8C42",
      bg: "rgba(255,140,66,0.12)",
      label: "High — Diabetic Range",
      icon: "alert-circle",
      advice: "Take prescribed medication and rest.",
    };
  return {
    color: "#FF4D4D",
    bg: "rgba(255,77,77,0.12)",
    label: "Very High — Critical",
    icon: "close-circle",
    advice: "Seek medical attention immediately.",
  };
};

export default function GlucoseTestScreen() {
  const router = useRouter();
  const { user, activeTheme } = useAuth();

  // 🚀 Bluetooth Context එකෙන් දත්ත ටික ගන්නවා
  const { status, isConnected, lastRawValue, lastReadingAt } = useBluetooth();

  const { colors, isDarkMode } = activeTheme || {
    colors: {
      background: "#F8F9FA",
      card: "#FFFFFF",
      text: "#1E1E24",
      textSecondary: "#6C757D",
      border: "#E9ECEF",
      primary: "#C1121F",
    },
    isDarkMode: false,
  };

  const [screenState, setScreenState] = useState("waiting");
  const [capturedGlucose, setCapturedGlucose] = useState(null);
  const [savedReading, setSavedReading] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 💡 වැදගත්: Retake කරද්දී පරණ timestamp එක skip කරන්න useRef එකක් තියාගන්නවා
  const lastProcessedTimeRef = useRef(0);

  const [ring1] = useState(new Animated.Value(1));
  const [ring2] = useState(new Animated.Value(1));
  const [ring3] = useState(new Animated.Value(1));
  const [ringOpacity1] = useState(new Animated.Value(0.8));
  const [ringOpacity2] = useState(new Animated.Value(0.5));
  const [ringOpacity3] = useState(new Animated.Value(0.25));

  const [cardFade] = useState(new Animated.Value(0));
  const [cardSlide] = useState(new Animated.Value(40));

  const stateRef = useRef(screenState);
  useEffect(() => {
    stateRef.current = screenState;
  }, [screenState]);

  // ── 📡 REAL-TIME BLUETOOTH DATA STREAM WATCHER ──
  useEffect(() => {
    if (stateRef.current !== "waiting") return;

    // දත්ත නැත්නම් ස්කිප් කරනවා
    if (
      lastRawValue === null ||
      lastRawValue === undefined ||
      lastRawValue === ""
    )
      return;

    // 💡 Retake ගැහුවම, අලුතෙන්ම ආපු රීඩින්ග් එකක්ද කියලා බලන්න බ්ලූටූත් එකේ දත්ත ආපු වෙලාව (lastReadingAt) චෙක් කරනවා
    if (lastReadingAt <= lastProcessedTimeRef.current) return;

    const numericValue = parseFloat(lastRawValue);

    if (!isNaN(numericValue) && numericValue > 0) {
      console.log("BLE Live Data Captured in UI:", numericValue);
      const clamped = Math.max(40, Math.min(400, Math.round(numericValue)));

      lastProcessedTimeRef.current = lastReadingAt; // මේ ආපු timestamp එක process කළා කියලා මාක් කරගන්නවා

      queueMicrotask(() => {
        setCapturedGlucose(clamped);
        setScreenState("received");
      });
    }
  }, [lastRawValue, lastReadingAt]);

  // Offline හඳුනාගැනීම
  useEffect(() => {
    if (!isConnected && screenState === "waiting") {
      setTimeout(() => {
        setErrorMsg("ESP32 disconnected. Reconnect and try again.");
        setScreenState("offline");
      }, 0);
    }
  }, [isConnected, screenState]);

  // 30-second timeout
  useEffect(() => {
    if (screenState !== "waiting") return;
    const timer = setTimeout(() => {
      setErrorMsg(
        "No reading received in 30 seconds.\nCheck the Bluetooth connection and ESP32 power.",
      );
      setScreenState("timeout");
    }, WAIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [screenState]);

  // ── Pulse Animation ───────────────────────────
  useEffect(() => {
    if (screenState !== "waiting") {
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring3.stopAnimation();
      return;
    }

    const makeLoop = (scale, opacity, delay) => {
      const id = setTimeout(() => {
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 1.45,
                duration: 1100,
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 1,
                duration: 1100,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.1,
                duration: 1100,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: opacity._value,
                duration: 1100,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ).start();
      }, delay);
      return id;
    };

    const t1 = makeLoop(ring1, ringOpacity1, 0);
    const t2 = makeLoop(ring2, ringOpacity2, 370);
    const t3 = makeLoop(ring3, ringOpacity3, 740);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring3.stopAnimation();
    };
  }, [
    screenState,
    ring1,
    ring2,
    ring3,
    ringOpacity1,
    ringOpacity2,
    ringOpacity3,
  ]);

  // ── Result Card Entrance Animation ──────────────────────────────
  useEffect(() => {
    if (screenState === "received" || screenState === "saved") {
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 480,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [screenState, cardFade, cardSlide]);

  // Save Reading
  const handleSave = async () => {
    if (capturedGlucose === null) return;
    setScreenState("saving");
    try {
      let reading;
      if (user) {
        reading = await saveGlucoseReading(user.uniqueId, capturedGlucose);
        await fetchPatientReadings(user.uniqueId);
      } else {
        const now = new Date();
        reading = {
          glucose: capturedGlucose,
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: now.toISOString().split("T")[0],
        };
      }
      setSavedReading(reading);
      setScreenState("saved");
    } catch (err) {
      console.warn("[GlucoseTest] Save failed:", err);
      setErrorMsg("Failed to save. Please try again.");
      setScreenState("timeout");
    }
  };

  // 🔄 Retake / Retry Button
  const handleRetry = () => {
    // 💡 වැදගත්: Retake ඔබන මොහොතේ තියෙන timestamp එක මාක් කරගන්නවා, ඊටපස්සේ එන අලුත් එක විතරක් අල්ලන්න
    lastProcessedTimeRef.current = Date.now();
    setCapturedGlucose(null);
    setSavedReading(null);
    setErrorMsg("");
    cardFade.setValue(0);
    cardSlide.setValue(40);
    setScreenState("waiting");
  };

  const glucoseInfo =
    capturedGlucose !== null ? getGlucoseInfo(capturedGlucose) : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Blood Glucose Test
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* WAITING STATE */}
        {screenState === "waiting" && (
          <View style={styles.waitingContainer}>
            <View style={styles.ringsWrapper}>
              <Animated.View
                style={[
                  styles.ring,
                  styles.ringOuter,
                  {
                    borderColor: colors.primary,
                    transform: [{ scale: ring3 }],
                    opacity: ringOpacity3,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.ring,
                  styles.ringMid,
                  {
                    borderColor: colors.primary,
                    transform: [{ scale: ring2 }],
                    opacity: ringOpacity2,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.ring,
                  styles.ringInner,
                  {
                    borderColor: colors.primary,
                    transform: [{ scale: ring1 }],
                    opacity: ringOpacity1,
                  },
                ]}
              />
              <View
                style={[styles.ringCenter, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="water" size={38} color="#FFFFFF" />
              </View>
            </View>

            <Text style={[styles.waitTitle, { color: colors.text }]}>
              Scanning for Reading…
            </Text>
            <Text
              style={[styles.waitSubtitle, { color: colors.textSecondary }]}
            >
              Hold the sensor steady.{"\n"}Data will appear automatically.
            </Text>

            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginTop: 24 }}
            />

            <View
              style={[
                styles.espChip,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.espDot,
                  { backgroundColor: isConnected ? "#2DCD91" : "#FF4D4D" },
                ]}
              />
              <Text
                style={[styles.espChipText, { color: colors.textSecondary }]}
              >
                ESP32 — {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>
        )}

        {/* RECEIVED STATE */}
        {screenState === "received" && glucoseInfo && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: cardFade,
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <View
              style={[styles.glucoseCircle, { borderColor: glucoseInfo.color }]}
            >
              <Text style={[styles.glucoseValue, { color: glucoseInfo.color }]}>
                {capturedGlucose}
              </Text>
              <Text
                style={[styles.glucoseUnit, { color: colors.textSecondary }]}
              >
                mg/dL
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: glucoseInfo.bg }]}>
              <Ionicons
                name={glucoseInfo.icon}
                size={16}
                color={glucoseInfo.color}
              />
              <Text style={[styles.badgeText, { color: glucoseInfo.color }]}>
                {glucoseInfo.label}
              </Text>
            </View>
            <Text style={[styles.adviceText, { color: colors.textSecondary }]}>
              {glucoseInfo.advice}
            </Text>
            <Text
              style={[styles.timestampText, { color: colors.textSecondary }]}
            >
              Captured at{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Save Reading</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={handleRetry}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Retake
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* SAVING STATE */}
        {screenState === "saving" && (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.stateTitle, { color: colors.text, marginTop: 20 }]}
            >
              Saving to database…
            </Text>
          </View>
        )}

        {/* SAVED STATE */}
        {screenState === "saved" && savedReading && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: cardFade,
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <View style={[styles.successCircle, { borderColor: "#2DCD91" }]}>
              <Ionicons name="checkmark" size={52} color="#2DCD91" />
            </View>
            <Text style={[styles.savedTitle, { color: colors.text }]}>
              Reading Saved!
            </Text>
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor: isDarkMode ? "#1A1A24" : "#F4F7FF",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Glucose
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: getGlucoseInfo(savedReading.glucose).color },
                  ]}
                >
                  {savedReading.glucose} mg/dL
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Status
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: getGlucoseInfo(savedReading.glucose).color },
                  ]}
                >
                  {getGlucoseInfo(savedReading.glucose).label}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Time
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {savedReading.time}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Date
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {savedReading.date}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Ionicons name="home-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={handleRetry}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Take Another Reading
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* TIMEOUT / OFFLINE ERROR STATE */}
        {(screenState === "timeout" || screenState === "offline") && (
          <View style={styles.centeredState}>
            <View style={[styles.errorCircle, { borderColor: "#FF4D4D" }]}>
              <Ionicons name="warning-outline" size={48} color="#FF4D4D" />
            </View>
            <Text
              style={[styles.stateTitle, { color: colors.text, marginTop: 20 }]}
            >
              {screenState === "offline"
                ? "Device Disconnected"
                : "No Reading Received"}
            </Text>
            <Text
              style={[
                styles.stateSubtitle,
                {
                  color: colors.textSecondary,
                  textAlign: "center",
                  paddingHorizontal: 20,
                },
              ]}
            >
              {errorMsg}
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  marginTop: 30,
                  width: "80%",
                },
              ]}
              onPress={handleRetry}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Retry Scan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// 💡 Styles ටික කලින් තිබ්බ විදිහටම පිරිසිදුව තබා ඇත
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  body: { flex: 1, justifyContent: "center", padding: 24 },
  waitingContainer: { alignItems: "center", justifyContent: "center" },
  ringsWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  ringOuter: { width: 190, height: 190, borderRadius: 95 },
  ringMid: { width: 165, height: 165, borderRadius: 82.5 },
  ringInner: { width: 140, height: 140, borderRadius: 70 },
  ringCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  waitTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  waitSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  espChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 40,
  },
  espDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  espChipText: { fontSize: 12, fontWeight: "600" },
  resultCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glucoseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  glucoseValue: { fontSize: 44, fontWeight: "900" },
  glucoseUnit: { fontSize: 12, fontWeight: "700", marginTop: -2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { fontSize: 13, fontWeight: "700", marginLeft: 6 },
  adviceText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  timestampText: { fontSize: 11, marginBottom: 24 },
  divider: { width: "100%", height: 1, marginBottom: 20 },
  primaryBtn: {
    flexDirection: "row",
    width: "100%",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  secondaryBtn: {
    flexDirection: "row",
    width: "100%",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "700", marginLeft: 8 },
  centeredState: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateTitle: { fontSize: 18, fontWeight: "700" },
  stateSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  savedTitle: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  summaryBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 13, fontWeight: "600" },
  summaryValue: { fontSize: 14, fontWeight: "700" },
  summaryDivider: { width: "100%", height: 1, marginVertical: 8 },
  errorCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
