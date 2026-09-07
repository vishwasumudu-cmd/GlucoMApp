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
import Svg, { Path, Circle, Line, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { fetchPatientReadings } from '../../firebase/firebaseService';
import { compileWeeklyMetrics } from '../../utils/helpers';
import Card from '../../components/Card';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // Adjusting for padding
const CHART_HEIGHT = 180;

export default function AnalyticsScreen() {
  const { user, activeTheme } = useAuth();
  const { colors, isDarkMode } = activeTheme;

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly'); // 'daily' | 'weekly'

  useEffect(() => {
    if (!user) return;
    
    const loadReadings = async () => {
      try {
        const data = await fetchPatientReadings(user.uniqueId);
        setReadings(data);
      } catch (err) {
        console.warn("Failed to load analytics readings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReadings();
    
    // Refresh data periodically
    const interval = setInterval(loadReadings, 6000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Compile weekly aggregates
  const weeklyData = compileWeeklyMetrics(readings);
  
  // Extract today's readings
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReadings = readings
    .filter(r => r.date === todayStr)
    .sort((a, b) => a.timestamp - b.timestamp); // Chronological order

  // Calculate statistics
  const totalReadings = readings.length;
  const highReadings = readings.filter(r => r.glucose > 140).length;
  const lowReadings = readings.filter(r => r.glucose < 70).length;
  const normalReadings = totalReadings - highReadings - lowReadings;
  const inRangePercent = totalReadings > 0 ? Math.round((normalReadings / totalReadings) * 100) : 0;
  
  const allGlucoseVals = readings.map(r => Number(r.glucose));
  const maxGlucose = allGlucoseVals.length > 0 ? Math.max(...allGlucoseVals) : 0;
  const minGlucose = allGlucoseVals.length > 0 ? Math.min(...allGlucoseVals) : 0;

  // Custom SVG Chart Drawer Function
  const renderLineChart = (dataPoints, labels, yMax = 220, yMin = 40) => {
    if (dataPoints.length === 0 || dataPoints.every(v => v === 0)) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            Insufficient data to render chart.
          </Text>
        </View>
      );
    }

    const paddingX = 35;
    const paddingY = 20;
    const graphWidth = CHART_WIDTH - paddingX - 10;
    const graphHeight = CHART_HEIGHT - paddingY - 20;

    // Helper: Map data value to SVG coordinate
    const getX = (index) => {
      if (dataPoints.length <= 1) return paddingX + graphWidth / 2;
      return paddingX + (index / (dataPoints.length - 1)) * graphWidth;
    };

    const getY = (val) => {
      const clampedVal = Math.max(yMin, Math.min(yMax, val));
      const percentage = (clampedVal - yMin) / (yMax - yMin);
      return paddingY + graphHeight - percentage * graphHeight;
    };

    // Build the SVG path string
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

    // Healthy thresholds lines (70 & 140)
    const y70 = getY(70);
    const y140 = getY(140);
    const y200 = getY(200);

    return (
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.3" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Shaded Clinical Target Range Box (70 - 140 mg/dL) */}
          <Rect 
            x={paddingX} 
            y={y140} 
            width={graphWidth} 
            height={y70 - y140} 
            fill="rgba(45, 205, 145, 0.08)"
          />

          {/* Guidelines */}
          <Line x1={paddingX} y1={y70} x2={CHART_WIDTH - 10} y2={y70} stroke={isDarkMode ? '#2A2A35' : '#E9ECEF'} strokeWidth="1.5" strokeDasharray="5, 5" />
          <Line x1={paddingX} y1={y140} x2={CHART_WIDTH - 10} y2={y140} stroke={isDarkMode ? '#2A2A35' : '#E9ECEF'} strokeWidth="1.5" strokeDasharray="5, 5" />

          {/* Y Axis Labels */}
          <SvgText x={paddingX - 8} y={y70 + 4} fill={colors.textSecondary} fontSize="10" textAnchor="end" fontWeight="bold">70</SvgText>
          <SvgText x={paddingX - 8} y={y140 + 4} fill={colors.textSecondary} fontSize="10" textAnchor="end" fontWeight="bold">140</SvgText>
          <SvgText x={paddingX - 8} y={y200 + 4} fill={colors.textSecondary} fontSize="10" textAnchor="end" fontWeight="bold">200</SvgText>

          {/* Shaded Area Under Line */}
          <Path d={fillD} fill="url(#grad)" />

          {/* Core Line Path */}
          <Path d={pathD} fill="none" stroke={colors.primary} strokeWidth="3" />

          {/* Data Points */}
          {dataPoints.map((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            return (
              <Circle 
                key={idx} 
                cx={x} 
                cy={y} 
                r="4.5" 
                fill={colors.card} 
                stroke={colors.primary} 
                strokeWidth="2.5" 
              />
            );
          })}

          {/* X Axis Labels */}
          {labels.map((lbl, idx) => {
            // Draw subset of labels if too crowded
            if (labels.length > 7 && idx % Math.ceil(labels.length / 5) !== 0) return null;
            return (
              <SvgText 
                key={idx} 
                x={getX(idx)} 
                y={CHART_HEIGHT - 4} 
                fill={colors.textSecondary} 
                fontSize="10" 
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

  // Switch display arrays
  const graphValues = activeTab === 'weekly' ? weeklyData.averages : todayReadings.map(r => r.glucose);
  const graphLabels = activeTab === 'weekly' ? weeklyData.labels : todayReadings.map(r => r.time);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Statistics Cards Deck */}
      <View style={styles.statsDeck}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
          <Text style={[styles.statVal, { color: colors.text }]}>
            {activeTab === 'weekly' ? weeklyData.avgGlucose : todayReadings.reduce((acc, r) => acc + r.glucose, 0) ? Math.round(todayReadings.reduce((acc, r) => acc + r.glucose, 0) / todayReadings.length) : 0}
          </Text>
          <Text style={[styles.statUnit, { color: colors.textSecondary }]}>mg/dL</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Target</Text>
          <Text style={[styles.statVal, { color: colors.statusNormal }]}>{inRangePercent}%</Text>
          <Text style={[styles.statUnit, { color: colors.textSecondary }]}>70-140 mg/dL</Text>
        </View>
      </View>

      {/* 2. Toggle Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('weekly')}
          style={[
            styles.tabItem, 
            activeTab === 'weekly' && { backgroundColor: colors.primary }
          ]}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'weekly' ? '#FFFFFF' : colors.text }
          ]}>
            Weekly Averages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('daily')}
          style={[
            styles.tabItem, 
            activeTab === 'daily' && { backgroundColor: colors.primary }
          ]}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'daily' ? '#FFFFFF' : colors.text }
          ]}>
            Today&apos;s Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Main Chart Card */}
      <Card title={activeTab === 'weekly' ? '7-Day Trend Analysis' : 'Today\'s Telemetry Log'}>
        {renderLineChart(graphValues, graphLabels)}
        
        {/* Chart Color Legend Explanation */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: 'rgba(45, 205, 145, 0.2)', borderWidth: 1, borderColor: colors.statusNormal }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Clinical Target Range</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Telemetry Curve</Text>
          </View>
        </View>
      </Card>

      {/* 4. Complete Stats Analytics Overview */}
      <Card title="Clinical Summary Report">
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Total Logs Saved</Text>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{totalReadings}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Fasting Target (Lowest)</Text>
          <Text style={[styles.summaryVal, { color: colors.primary }]}>{minGlucose} mg/dL</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Peak Glucose (Highest)</Text>
          <Text style={[styles.summaryVal, { color: colors.statusDanger }]}>{maxGlucose} mg/dL</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Normal Range Logs</Text>
          <Text style={[styles.summaryVal, { color: colors.statusNormal }]}>{normalReadings}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>High Glucose Incidents</Text>
          <Text style={[styles.summaryVal, { color: colors.statusDanger }]}>{highReadings}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Hypoglycemia Incidents (Low)</Text>
          <Text style={[styles.summaryVal, { color: isDarkMode ? '#4D96FF' : '#0066FF' }]}>{lowReadings}</Text>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsDeck: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    flex: 0.48,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
  },
  tabItem: {
    flex: 0.5,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendIndicator: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDivider: {
    height: 1,
  }
});
