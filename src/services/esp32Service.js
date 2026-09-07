import { saveGlucoseReading } from '../firebase/firebaseService';

// Subscribers callbacks lists
let glucoseSubscribers = [];
let connectionSubscribers = [];

let isConnected = false;
let simulationInterval = null;
let currentPatientId = null;

// Simulated reading range control
// 'normal', 'high', 'low' or 'random'
let simulationMode = 'random'; 

const notifyConnectionSubscribers = () => {
  connectionSubscribers.forEach(cb => cb(isConnected));
};

const notifyGlucoseSubscribers = (reading) => {
  glucoseSubscribers.forEach(cb => cb(reading));
};

export const ESP32Service = {
  // Start the background data generator
  startSimulation: (patientId) => {
    currentPatientId = patientId;
    if (simulationInterval) clearInterval(simulationInterval);
    
    // Start simulation disconnected so patient must test connection
    isConnected = false;
    notifyConnectionSubscribers();

    simulationInterval = setInterval(async () => {
      if (!isConnected || !currentPatientId) return;

      // Generate realistic reading based on active mode
      let glucose = 100;
      switch (simulationMode) {
        case 'normal':
          // 80 to 125 mg/dL
          glucose = Math.floor(80 + Math.random() * 45);
          break;
        case 'high':
          // 145 to 260 mg/dL
          glucose = Math.floor(145 + Math.random() * 115);
          break;
        case 'low':
          // 45 to 68 mg/dL
          glucose = Math.floor(45 + Math.random() * 23);
          break;
        default: // 'random'
          // 80% chance normal, 10% high, 10% low
          const roll = Math.random();
          if (roll < 0.8) {
            glucose = Math.floor(80 + Math.random() * 45); // normal
          } else if (roll < 0.9) {
            glucose = Math.floor(145 + Math.random() * 80); // high
          } else {
            glucose = Math.floor(45 + Math.random() * 23); // low
          }
          break;
      }

      try {
        const newReading = await saveGlucoseReading(currentPatientId, glucose);
        notifyGlucoseSubscribers(newReading);
      } catch (err) {
        console.warn("ESP32 simulation failed to save reading:", err);
      }
    }, 6000); // Send reading every 6 seconds for dynamic UI experience
  },

  stopSimulation: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  },

  // Toggle connection state
  setConnected: (connected) => {
    isConnected = connected;
    notifyConnectionSubscribers();
    console.log(`ESP32 Connection State: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
  },

  getConnected: () => isConnected,

  // Change active simulated ranges
  setSimulationMode: (mode) => {
    simulationMode = mode; // 'normal', 'high', 'low', 'random'
  },

  getSimulationMode: () => simulationMode,

  // Direct manual trigger to instantly fire a reading of a specific level
  triggerSingleReading: async (mode) => {
    if (!currentPatientId) return null;
    
    let glucose = 100;
    if (mode === 'normal') glucose = Math.floor(85 + Math.random() * 25);
    else if (mode === 'high') glucose = Math.floor(160 + Math.random() * 60);
    else if (mode === 'low') glucose = Math.floor(50 + Math.random() * 15);

    try {
      const newReading = await saveGlucoseReading(currentPatientId, glucose);
      notifyGlucoseSubscribers(newReading);
      return newReading;
    } catch (err) {
      console.warn("ESP32 simulation manual trigger failed:", err);
      return null;
    }
  },

  // Subscription management
  subscribeGlucose: (callback) => {
    glucoseSubscribers.push(callback);
    return () => {
      glucoseSubscribers = glucoseSubscribers.filter(cb => cb !== callback);
    };
  },

  subscribeConnection: (callback) => {
    connectionSubscribers.push(callback);
    callback(isConnected); // Immediate initial update
    return () => {
      connectionSubscribers = connectionSubscribers.filter(cb => cb !== callback);
    };
  }
};
