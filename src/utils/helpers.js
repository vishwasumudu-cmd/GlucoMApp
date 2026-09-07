/**
 * Analyzes a blood glucose value and returns status classifications, 
 * styling colors, and clinical recommendations.
 */
export const getGlucoseStatus = (glucoseVal, isDarkMode = false) => {
  const val = Number(glucoseVal);
  
  if (isNaN(val) || val <= 0) {
    return {
      status: 'Unknown',
      color: '#A0A0A5',
      badgeBg: 'rgba(160, 160, 165, 0.15)',
      description: 'Waiting for device reading...',
      healthIndicator: 'Yellow' // Warning fallback
    };
  }

  // Clinical thresholds:
  // Low: < 70 mg/dL
  // Normal: 70 - 140 mg/dL
  // High: > 140 mg/dL
  if (val < 70) {
    return {
      status: 'Low',
      color: isDarkMode ? '#4D96FF' : '#0066FF', // Clinical blue Alert
      badgeBg: isDarkMode ? 'rgba(77, 150, 255, 0.15)' : 'rgba(0, 102, 255, 0.1)',
      description: 'Hypoglycemia detected. Consume 15g of fast-acting carbs (juice, candy) and retest in 15 mins.',
      healthIndicator: 'Red' // Dangerous
    };
  } else if (val <= 140) {
    return {
      status: 'Normal',
      color: isDarkMode ? '#2DCD91' : '#2A9D8F', // Healthy green
      badgeBg: isDarkMode ? 'rgba(45, 205, 145, 0.15)' : 'rgba(42, 157, 143, 0.1)',
      description: 'Your blood glucose is in the optimal target range. Keep up the good work!',
      healthIndicator: 'Green' // Safe
    };
  } else {
    return {
      status: 'High',
      color: '#C1121F', // Blood Red / Medical Danger
      badgeBg: 'rgba(193, 18, 31, 0.12)',
      description: 'Hyperglycemia detected. Monitor symptoms, stay hydrated, and follow your insulin plan.',
      healthIndicator: 'Red' // Dangerous
    };
  }
};

/**
 * Formats timestamp into local readable date.
 */
export const formatDateString = (timestamp) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Formats timestamp into AM/PM time.
 */
export const formatTimeString = (timestamp) => {
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Aggregates daily averages and metrics for weekly line charts
 */
export const compileWeeklyMetrics = (readings = []) => {
  if (readings.length === 0) {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      averages: [0, 0, 0, 0, 0, 0, 0],
      lowCount: 0,
      normalCount: 0,
      highCount: 0,
      avgGlucose: 0
    };
  }

  // Get last 7 days keys
  const now = new Date();
  const last7Days = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = day.toISOString().split('T')[0];
    last7Days.push({
      date: dateStr,
      label: weekdayNames[day.getDay()]
    });
  }

  // Group readings by date
  const readingsByDate = {};
  let lowCount = 0;
  let normalCount = 0;
  let highCount = 0;
  let totalGlucoseSum = 0;
  let validCount = 0;

  readings.forEach(r => {
    const g = Number(r.glucose);
    if (!readingsByDate[r.date]) {
      readingsByDate[r.date] = [];
    }
    readingsByDate[r.date].push(g);

    // Increment indicators
    if (g < 70) lowCount++;
    else if (g <= 140) normalCount++;
    else highCount++;

    totalGlucoseSum += g;
    validCount++;
  });

  // Build daily average array
  const averages = last7Days.map(day => {
    const dayReadings = readingsByDate[day.date];
    if (!dayReadings || dayReadings.length === 0) return 0;
    const sum = dayReadings.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / dayReadings.length);
  });

  return {
    labels: last7Days.map(d => d.label),
    averages,
    lowCount,
    normalCount,
    highCount,
    avgGlucose: validCount > 0 ? Math.round(totalGlucoseSum / validCount) : 0
  };
};
