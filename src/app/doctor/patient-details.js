import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { searchPatientById, fetchPatientReadings, subscribeLiveGlucose } from '../../firebase/firebaseService';
import { compileWeeklyMetrics, getGlucoseStatus } from '../../utils/helpers';
import Card from '../../components/Card';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;

export default function PatientDetailsScreen() {
  const { patientId } = useLocalSearchParams();
  const { activeTheme } = useAuth();
  const { colors, isDarkMode } = activeTheme;

  const [patient, setPatient] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly');

  // Load Patient Profile Details
  useEffect(() => {
    if (!patientId) return;

    const loadProfile = async () => {
      try {
        const profile = await searchPatientById(patientId);
        setPatient(profile);
      } catch (err) {
        console.warn("Failed to load patient profile:", err);
      }
    };

    loadProfile();
  }, [patientId]);

  // Load readings and listen for live updates
  useEffect(() => {
    if (!patientId) return;

    const loadHistory = async () => {
      try {
        const logs = await fetchPatientReadings(patientId);
        setReadings(logs);
      } catch (err) {
        console.warn("Failed to load patient readings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();

    // Subscribe to live glucose updates from this patient
    const unsubscribe = subscribeLiveGlucose(patientId, (newReading) => {
      setReadings(prev => {
        // Prevent duplicate logs
        const exists = prev.some(r => r.timestamp === newReading.timestamp);
        if (exists) return prev;
        return [newReading, ...prev];
      });
    });

    return () => unsubscribe();
  }, [patientId]);

  if (loading || !patient) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Patient telemetry file...</Text>
      </View>
    );
  }

  // Compile calculations
  const weeklyData = compileWeeklyMetrics(readings);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReadings = readings
    .filter(r => r.date === todayStr)
    .sort((a, b) => a.timestamp - b.timestamp);

  const latestReading = readings.length > 0 ? readings[0] : null;
  const statusInfo = getGlucoseStatus(latestReading?.glucose, isDarkMode);

  // Status indicators color classification
  const getIndicatorColor = (indicator) => {
    if (indicator === 'Green') return colors.statusNormal;
    if (indicator === 'Yellow') return colors.statusWarning;
    return colors.statusDanger;
  };

  // Custom SVG Chart Drawer Function
  const renderLineChart = (dataPoints, labels, yMax = 220, yMin = 40) => {
    if (dataPoints.length === 0 || dataPoints.every(v => v === 0)) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            No telemetry records logged today.
          </Text>
        </View>
      );
    }

    const paddingX = 35;
    const paddingY = 15;
    const graphWidth = CHART_WIDTH - paddingX - 10;
    const graphHeight = CHART_HEIGHT - paddingY - 20;

    const getX = (index) => {
      if (dataPoints.length <= 1) return paddingX + graphWidth / 2;
      return paddingX + (index / (dataPoints.length - 1)) * graphWidth;
    };

    const getY = (val) => {
      const clampedVal = Math.max(yMin, Math.min(yMax, val));
      const percentage = (clampedVal - yMin) / (yMax - yMin);
      return paddingY + graphHeight - percentage * graphHeight;
    };

    let pathD = '';
    let fillD = '';
    
    dataPoints.forEach((val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      if (idx === 0) {
        pathD = `M ${x} ${y}`;
        fillD = `M ${x} ${paddingY + graphHeight} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        fillD += ` L ${x} ${y}`;
      }
      if (idx === dataPoints.length - 1) {
        fillD += ` L ${x} ${paddingY + graphHeight} Z`;
      }
    });

    const y70 = getY(70);
    const y140 = getY(140);

    return (
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Shaded Clinical Target Range Box */}
          <Rect 
            x={paddingX} 
            y={y140} 
            width={graphWidth} 
            height={y70 - y140} 
            fill="rgba(45, 205, 145, 0.08)"
          />

          <Line x1={paddingX} y1={y70} x2={CHART_WIDTH - 10} y2={y70} stroke={isDarkMode ? '#2A2A35' : '#E9ECEF'} strokeWidth="1.2" strokeDasharray="4, 4" />
          <Line x1={paddingX} y1={y140} x2={CHART_WIDTH - 10} y2={y140} stroke={isDarkMode ? '#2A2A35' : '#E9ECEF'} strokeWidth="1.2" strokeDasharray="4, 4" />

          <SvgText x={paddingX - 8} y={y70 + 3} fill={colors.textSecondary} fontSize="9" textAnchor="end" fontWeight="bold">70</SvgText>
          <SvgText x={paddingX - 8} y={y140 + 3} fill={colors.textSecondary} fontSize="9" textAnchor="end" fontWeight="bold">140</SvgText>

          <Path d={fillD} fill="url(#grad)" />
          <Path d={pathD} fill="none" stroke={colors.primary} strokeWidth="2.5" />

          {dataPoints.map((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            return (
              <Circle 
                key={idx} 
                cx={x} 
                cy={y} 
                r="3.5" 
                fill={colors.card} 
                stroke={colors.primary} 
                strokeWidth="2" 
              />
            );
          })}

          {labels.map((lbl, idx) => {
            if (labels.length > 7 && idx % Math.ceil(labels.length / 5) !== 0) return null;
            return (
              <SvgText 
                key={idx} 
                x={getX(idx)} 
                y={CHART_HEIGHT - 4} 
                fill={colors.textSecondary} 
                fontSize="9" 
                textAnchor="middle"
                fontWeight="600"
              >
                {lbl}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  const graphValues = activeTab === 'weekly' ? weeklyData.averages : todayReadings.map(r => r.glucose);
  const graphLabels = activeTab === 'weekly' ? weeklyData.labels : todayReadings.map(r => r.time);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Patient Profile Info Strip */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.nameText, { color: colors.text }]}>{patient.fullName}</Text>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>{patient.uniqueId}</Text>
            </View>
          </View>

          {/* Clinical Alert Indicator badge */}
          <View style={[
            styles.alertBadge, 
            { 
              backgroundColor: getIndicatorColor(statusInfo.healthIndicator),
            }
          ]}>
            <Text style={styles.alertText}>
              {statusInfo.healthIndicator === 'Green' ? 'Stable' : statusInfo.healthIndicator === 'Yellow' ? 'Warning' : 'Critical'}
            </Text>
          </View>
        </View>
      </Card>

      {/* 2. Real-time Telemetry strip */}
      <Card title="Live Streaming Telemetry">
        <View style={styles.liveRow}>
          <View style={styles.liveLeft}>
            <View style={[styles.pulseCircle, { backgroundColor: 'rgba(45, 205, 145, 0.1)' }]}>
              <View style={[styles.pulseInner, { backgroundColor: colors.statusNormal }]} />
            </View>
            <View style={styles.liveTextCol}>
              <Text style={[styles.liveTitle, { color: colors.text }]}>Patient Telemetry Link</Text>
              <Text style={[styles.liveStatusDesc, { color: colors.textSecondary }]}>
                {latestReading ? 'Streaming live glucose updates' : 'No connection established'}
              </Text>
            </View>
          </View>
          
          <View style={styles.liveValueCol}>
            <Text style={[styles.liveVal, { color: latestReading ? statusInfo.color : colors.textSecondary }]}>
              {latestReading ? latestReading.glucose : '---'}
            </Text>
            <Text style={[styles.liveUnit, { color: colors.textSecondary }]}>mg/dL</Text>
          </View>
        </View>
      </Card>

      {/* 3. Analytics Charts */}
      <Card title={activeTab === 'weekly' ? '7-Day Trend Analysis' : 'Today\'s Telemetry Log'} headerRight={
        <View style={styles.tabToggleRow}>
          <TouchableOpacity 
            onPress={() => setActiveTab('weekly')}
            style={[styles.tabToggleBtn, activeTab === 'weekly' && { borderBottomColor: colors.primary }]}
          >
            <Text style={[styles.tabToggleText, { color: activeTab === 'weekly' ? colors.primary : colors.textSecondary }]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('daily')}
            style={[styles.tabToggleBtn, activeTab === 'daily' && { borderBottomColor: colors.primary }]}
          >
            <Text style={[styles.tabToggleText, { color: activeTab === 'daily' ? colors.primary : colors.textSecondary }]}>Today</Text>
          </TouchableOpacity>
        </View>
      }>
        {renderLineChart(graphValues, graphLabels)}
      </Card>

      {/* 4. Complete logs table */}
      <Card title="Telemetry Record Log" noPadding>
        {readings.length === 0 ? (
          <Text style={[styles.emptyTable, { color: colors.textSecondary }]}>
            No blood glucose records logged for this patient.
          </Text>
        ) : (
          readings.map((row, idx) => {
            const rowStatus = getGlucoseStatus(row.glucose, isDarkMode);
            return (
              <View 
                key={idx} 
                style={[
                  styles.tableRow,
                  { 
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx === readings.length - 1 ? 0 : 1
                  }
                ]}
              >
                <View style={styles.tableLeftCol}>
                  <View style={[styles.tableDot, { backgroundColor: getIndicatorColor(rowStatus.healthIndicator) }]} />
                  <View>
                    <Text style={[styles.tableGlucose, { color: colors.text }]}>
                      {row.glucose} <Text style={styles.tableUnit}>mg/dL</Text>
                    </Text>
                    <Text style={[styles.tableStatus, { color: rowStatus.color }]}>
                      {rowStatus.status} Range
                    </Text>
                  </View>
                </View>

                <View style={styles.tableRightCol}>
                  <Text style={[styles.tableTime, { color: colors.text }]}>{row.time}</Text>
                  <Text style={[styles.tableDate, { color: colors.textSecondary }]}>{row.date}</Text>
                </View>
              </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  profileCard: {
    marginVertical: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nameBlock: {
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  idText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  alertText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  liveTextCol: {
    justifyContent: 'center',
  },
  liveTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  liveStatusDesc: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  liveValueCol: {
    alignItems: 'flex-end',
  },
  liveVal: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  liveUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  tabToggleRow: {
    flexDirection: 'row',
  },
  tabToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginLeft: 10,
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyChartContainer: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyTable: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tableLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  tableGlucose: {
    fontSize: 14,
    fontWeight: '800',
  },
  tableUnit: {
    fontSize: 10,
    fontWeight: '500',
  },
  tableStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tableRightCol: {
    alignItems: 'flex-end',
  },
  tableTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableDate: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  }
});
