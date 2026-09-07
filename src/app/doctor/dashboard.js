import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import {
  fetchPatientReadings,
  searchPatientById,
  isFirebaseEnabled,
  db,
} from "../../firebase/firebaseService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getGlucoseStatus } from "../../utils/helpers";

export default function DoctorDashboard() {
  const { user, activeTheme } = useAuth();
  const { colors, isDarkMode } = activeTheme;
  const router = useRouter();

  // Directory of tracked patients in this session
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load / refresh recent patients lists
  const fetchRecentPatients = React.useCallback(async () => {
    try {
      const list = [];

      if (isFirebaseEnabled) {
        // Dynamic registry query from database
        const q = query(collection(db, "users"), where("role", "==", "Patient"));
        const snap = await getDocs(q);
        
        for (const docSnap of snap.docs) {
          const patientData = docSnap.data();
          const readings = await fetchPatientReadings(patientData.uniqueId);
          const latestVal = readings.length > 0 ? readings[0].glucose : null;
          
          list.push({
            ...patientData,
            latestGlucose: latestVal,
            status: getGlucoseStatus(latestVal, isDarkMode),
          });
        }
      } else {
        // Fallback for Mock Sandbox Mode
        const defaultPatient = await searchPatientById("GLU-PT-123456");
        if (defaultPatient) {
          const readings = await fetchPatientReadings(defaultPatient.uniqueId);
          const latestVal = readings.length > 0 ? readings[0].glucose : null;

          list.push({
            ...defaultPatient,
            latestGlucose: latestVal,
            status: getGlucoseStatus(latestVal, isDarkMode),
          });
        }
      }

      setPatients(list);
    } catch (e) {
      console.warn("Failed to load doctor dashboard recent list:", e);
    } finally {
      setLoading(false);
    }
  }, [isDarkMode]);

  // Triggers reload whenever screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRecentPatients();
    }, [fetchRecentPatients]),
  );

  const getIndicatorColor = (indicator) => {
    if (indicator === "Green") return colors.statusNormal;
    if (indicator === "Yellow") return colors.statusWarning;
    return colors.statusDanger;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome header section */}
      <View style={styles.headerBlock}>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Welcome Back,
        </Text>
        <Text style={[styles.doctorName, { color: colors.text }]}>
          {user?.fullName || "Dr. Gregory House"}
        </Text>
        <Text style={[styles.credentials, { color: colors.primary }]}>
          Lead Endocrinologist
        </Text>
      </View>

      {/* 1. Quick Actions Card */}
      <Card title="Quick Diagnostics Intake">
        <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
          Scan a patient&apos;s Health ID card QR code or search by unique ID to
          import and examine real-time telemetry.
        </Text>

        <View style={styles.actionBtnContainer}>
          <Button
            title="Scan QR Code Scanner"
            onPress={() => router.push("/doctor/scanner")}
            icon={<Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />}
            style={styles.scanBtn}
          />

          <Button
            title="Search Registry by ID"
            onPress={() => router.push("/doctor/search")}
            variant="outline"
            icon={<Ionicons name="search" size={20} color={colors.primary} />}
            style={styles.searchBtn}
          />
        </View>
      </Card>

      {/* 2. Clinical Overview Statistics */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statsBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={[styles.statsVal, { color: colors.text }]}>
            {patients.length}
          </Text>
          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
            Tracked Patients
          </Text>
        </View>

        <View
          style={[
            styles.statsBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={24}
            color={colors.statusDanger}
          />
          {/* If Sarah's status is danger (high/low), alert is active */}
          <Text style={[styles.statsVal, { color: colors.statusDanger }]}>
            {patients.filter((p) => p.status.healthIndicator === "Red").length}
          </Text>
          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>
            Clinical Alerts
          </Text>
        </View>
      </View>

      {/* 3. Patients Registry List */}
      <Card title="Clinical Patient Directory">
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ margin: 20 }}
          />
        ) : patients.length === 0 ? (
          <Text style={[styles.emptyDir, { color: colors.textSecondary }]}>
            No patients registered in your directory.
          </Text>
        ) : (
          patients.map((pat, idx) => {
            const hasStatus = pat.latestGlucose !== null;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(
                    `/doctor/patient-details?patientId=${pat.uniqueId}`,
                  )
                }
                style={[
                  styles.patientRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx === patients.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.patientMeta}>
                  <View
                    style={[
                      styles.avatarTextCircle,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.avatarText, { color: colors.primary }]}
                    >
                      {pat.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View style={styles.patientNamesCol}>
                    <Text
                      style={[styles.patientNameText, { color: colors.text }]}
                    >
                      {pat.fullName}
                    </Text>
                    <Text
                      style={[
                        styles.patientIdText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {pat.uniqueId}
                    </Text>
                  </View>
                </View>

                {/* Status Indicator color block */}
                <View style={styles.rightBadgeCol}>
                  {hasStatus ? (
                    <View style={styles.statusIndicatorWrapper}>
                      <View
                        style={[
                          styles.indicatorDot,
                          {
                            backgroundColor: getIndicatorColor(
                              pat.status.healthIndicator,
                            ),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.glucoseReadingText,
                          { color: colors.text },
                        ]}
                      >
                        {pat.latestGlucose}{" "}
                        <Text style={styles.mgUnit}>mg/dL</Text>
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.noStatusText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      No Telemetry
                    </Text>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </Card>
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
  headerBlock: {
    marginBottom: 20,
    marginTop: 8,
    paddingLeft: 4,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  doctorName: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  credentials: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  actionDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 16,
  },
  actionBtnContainer: {
    flexDirection: "column",
  },
  scanBtn: {
    marginVertical: 6,
  },
  searchBtn: {
    marginVertical: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  statsBox: {
    flex: 0.48,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsVal: {
    fontSize: 24,
    fontWeight: "900",
    marginVertical: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyDir: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 20,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  patientMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 0.6,
  },
  avatarTextCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  patientNamesCol: {
    justifyContent: "center",
  },
  patientNameText: {
    fontSize: 14,
    fontWeight: "700",
  },
  patientIdText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  rightBadgeCol: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 0.4,
  },
  statusIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  glucoseReadingText: {
    fontSize: 14,
    fontWeight: "800",
  },
  mgUnit: {
    fontSize: 10,
    fontWeight: "500",
  },
  noStatusText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 10,
  },
});
