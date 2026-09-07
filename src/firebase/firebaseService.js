import { 
  auth, db, rtdb, isFirebaseEnabled 
} from './config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, doc, setDoc, getDoc, addDoc, getDocs, query, where 
} from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import * as SecureStore from 'expo-secure-store';

export { isFirebaseEnabled, db };

// ==========================================
// MOCK DATABASE & SEED DATA SETUP
// ==========================================
const SECURE_STORE_USER_KEY = 'glucometer_user_session';
const SECURE_STORE_READINGS_KEY = 'glucometer_mock_readings';
const SECURE_STORE_REMINDERS_KEY = 'glucometer_mock_reminders';
const SECURE_STORE_USERS_DB_KEY = 'glucometer_mock_users_db';

// Generate 7 days of realistic historical blood glucose data
// Normal range: 70 - 140 mg/dL. Fasting target is under 100, post-meal is under 140.
const generateSeedReadings = (patientId) => {
  const seed = [];
  const now = new Date();
  
  // Seed readings for the last 7 days, 3 times a day (Morning, Afternoon, Evening)
  for (let i = 6; i >= 0; i--) {
    const dateStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Morning Reading (Fasting, usually 75-95)
    seed.push({
      patientId,
      glucose: Math.floor(75 + Math.random() * 25),
      timestamp: new Date(`${dateStr}T08:00:00`).getTime(),
      date: dateStr,
      time: '08:00 AM'
    });

    // Afternoon Reading (Post-Lunch, usually 110-145)
    seed.push({
      patientId,
      glucose: Math.floor(100 + Math.random() * 50),
      timestamp: new Date(`${dateStr}T14:30:00`).getTime(),
      date: dateStr,
      time: '02:30 PM'
    });

    // Evening Reading (Bedtime, usually 90-115)
    seed.push({
      patientId,
      glucose: Math.floor(85 + Math.random() * 35),
      timestamp: new Date(`${dateStr}T21:00:00`).getTime(),
      date: dateStr,
      time: '09:00 PM'
    });
  }
  return seed;
};

// In-Memory Fallback State (Synchronized with SecureStore if available)
let mockActiveUser = null;
let mockUsersDatabase = {
  // Pre-seed a test patient and a test doctor
  'GLU-PT-123456': {
    uid: 'mock-patient-uid',
    fullName: 'Sarah Connor',
    email: 'patient@glucometer.com',
    role: 'Patient',
    uniqueId: 'GLU-PT-123456',
    createdAt: new Date().toISOString()
  },
  'GLU-DR-789012': {
    uid: 'mock-doctor-uid',
    fullName: 'Dr. Gregory House',
    email: 'doctor@glucometer.com',
    role: 'Doctor',
    uniqueId: 'GLU-DR-789012',
    createdAt: new Date().toISOString()
  }
};

let mockReadings = [...generateSeedReadings('GLU-PT-123456')];
let mockReminders = {
  'GLU-PT-123456': { reminderTime: '08:00 AM', enabled: true }
};

// Helper: Attempt to load mock state from SecureStore to persist between reloads
const initMockDatabase = async () => {
  try {
    const savedUsers = await SecureStore.getItemAsync(SECURE_STORE_USERS_DB_KEY);
    if (savedUsers) mockUsersDatabase = JSON.parse(savedUsers);

    const savedReadings = await SecureStore.getItemAsync(SECURE_STORE_READINGS_KEY);
    if (savedReadings) {
      mockReadings = JSON.parse(savedReadings);
    } else {
      await SecureStore.setItemAsync(SECURE_STORE_READINGS_KEY, JSON.stringify(mockReadings));
    }

    const savedReminders = await SecureStore.getItemAsync(SECURE_STORE_REMINDERS_KEY);
    if (savedReminders) mockReminders = JSON.parse(savedReminders);

    const savedSession = await SecureStore.getItemAsync(SECURE_STORE_USER_KEY);
    if (savedSession) mockActiveUser = JSON.parse(savedSession);
  } catch (err) {
    console.warn("SecureStore mock db load failed, using memory:", err);
  }
};
initMockDatabase();

const syncMockDb = async (key, val) => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(val));
  } catch (_err) {
    // Fail silently in environments where SecureStore isn't available (e.g. web testing)
  }
};

// ==========================================
// AUTHENTICATION SERVICES
// ==========================================

export const registerUser = async (fullName, email, password, role) => {
  if (isFirebaseEnabled) {
    // 1. Create firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // 2. Generate custom Unique ID
    const randPart = Math.floor(100000 + Math.random() * 900000);
    const uniqueId = role === 'Patient' ? `GLU-PT-${randPart}` : `GLU-DR-${randPart}`;
    
    const userData = {
      uid,
      fullName,
      email,
      role,
      uniqueId,
      createdAt: new Date().toISOString()
    };
    
    // 3. Save profile to Firestore
    await setDoc(doc(db, 'users', uid), userData);
    return userData;
  } else {
    // Mock Registration Flow
    const exists = Object.values(mockUsersDatabase).some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
    }
    
    const randPart = Math.floor(100000 + Math.random() * 900000);
    const uniqueId = role === 'Patient' ? `GLU-PT-${randPart}` : `GLU-DR-${randPart}`;
    const uid = `mock-uid-${randPart}`;
    
    const userData = {
      uid,
      fullName,
      email,
      role,
      uniqueId,
      createdAt: new Date().toISOString()
    };

    mockUsersDatabase[uniqueId] = userData;
    // Map email login search key too
    mockUsersDatabase[uid] = userData;

    await syncMockDb(SECURE_STORE_USERS_DB_KEY, mockUsersDatabase);
    
    // Seed new patient with history
    if (role === 'Patient') {
      const newSeed = generateSeedReadings(uniqueId);
      mockReadings = [...mockReadings, ...newSeed];
      await syncMockDb(SECURE_STORE_READINGS_KEY, mockReadings);
    }
    
    mockActiveUser = userData;
    await syncMockDb(SECURE_STORE_USER_KEY, userData);
    return userData;
  }
};

export const loginUser = async (email, password) => {
  if (isFirebaseEnabled) {
    // 1. Authenticate
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // 2. Fetch role from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      throw new Error("User record not found in database.");
    }
  } else {
    // Mock Login Flow
    // Look up credentials (we allow mock logins like 'patient@glucometer.com' / any password)
    let foundUser = Object.values(mockUsersDatabase).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser) {
      // Create user on-the-fly for quick demo if they type a new email
      const isDoc = email.includes('doc');
      const name = isDoc ? 'Dr. Guest User' : 'Jane Doe (Guest)';
      const role = isDoc ? 'Doctor' : 'Patient';
      
      foundUser = await registerUser(name, email, password, role);
    }
    
    mockActiveUser = foundUser;
    await syncMockDb(SECURE_STORE_USER_KEY, foundUser);
    return foundUser;
  }
};

export const logoutUser = async () => {
  if (isFirebaseEnabled) {
    await firebaseSignOut(auth);
  } else {
    mockActiveUser = null;
    await SecureStore.deleteItemAsync(SECURE_STORE_USER_KEY).catch(() => {});
  }
};

export const sendPasswordReset = async (email) => {
  if (isFirebaseEnabled) {
    await sendPasswordResetEmail(auth, email);
  } else {
    // Mock Password Reset Flow
    const exists = Object.values(mockUsersDatabase).some(
      u => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
    if (!exists) {
      throw new Error("auth/user-not-found: There is no user record corresponding to this identifier.");
    }
    console.log(`[Mock Reset] Reset email sent to ${email}`);
  }
};

export const subscribeAuthState = (onUserChanged) => {
  if (isFirebaseEnabled) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            onUserChanged(userDoc.data());
          } else {
            onUserChanged(null);
          }
        } catch (_e) {
          onUserChanged(null);
        }
      } else {
        onUserChanged(null);
      }
    });
  } else {
    // Instant mock response
    onUserChanged(mockActiveUser);
    return () => {}; // No-op unsubscribe
  }
};

// ==========================================
// GLUCOSE READINGS SERVICES
// ==========================================

export const saveGlucoseReading = async (patientId, glucose) => {
  const timestamp = Date.now();
  const dateObj = new Date(timestamp);
  const date = dateObj.toISOString().split('T')[0];
  
  // Format standard time: e.g. "08:15 AM"
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const time = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  const reading = {
    patientId,
    glucose: Number(glucose),
    timestamp,
    date,
    time
  };

  if (isFirebaseEnabled) {
    // Step 1: Save to Firestore (primary storage — no artificial timeout, let it complete)
    await addDoc(collection(db, 'glucose_readings'), reading);

    // Step 2: Sync to RTDB for live dashboard (optional — fire-and-forget, won't block save)
    if (rtdb) {
      set(ref(rtdb, `live_readings/${patientId}`), reading)
        .catch(err => {
          console.warn("[RTDB] Live sync failed (non-critical):", err.message);
        });
    }
  } else {
    // Save to mock storage
    mockReadings.unshift(reading); // Add to beginning
    await syncMockDb(SECURE_STORE_READINGS_KEY, mockReadings);

    // Simulate database trigger event
    if (global.onMockLiveReadingCallback) {
      global.onMockLiveReadingCallback(reading);
    }
  }
  return reading;
};

export const fetchPatientReadings = async (patientId) => {
  if (isFirebaseEnabled) {
    // NOTE: Only filtering by patientId to avoid composite index requirement.
    // Sorting is done client-side.
    const q = query(
      collection(db, 'glucose_readings'),
      where('patientId', '==', patientId)
    );
    const snap = await getDocs(q);
    const readings = [];
    snap.forEach(docSnap => {
      readings.push(docSnap.data());
    });
    // Sort descending by timestamp client-side
    readings.sort((a, b) => b.timestamp - a.timestamp);
    return readings;
  } else {
    // Return filtered readings from local DB
    return mockReadings
      .filter(r => r.patientId === patientId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
};

export const subscribeLiveGlucose = (patientId, onReadingReceived) => {
  if (isFirebaseEnabled && rtdb) {
    const liveRef = ref(rtdb, `live_readings/${patientId}`);
    const unsubscribe = onValue(liveRef, (snapshot) => {
      if (snapshot.exists()) {
        onReadingReceived(snapshot.val());
      }
    });
    return () => off(liveRef, 'value', unsubscribe);
  } else {
    // Setup local event subscription for simulated ESP32
    global.onMockLiveReadingCallback = (reading) => {
      if (reading.patientId === patientId) {
        onReadingReceived(reading);
      }
    };
    return () => {
      global.onMockLiveReadingCallback = null;
    };
  }
};

// ==========================================
// REMINDER SYSTEM SERVICES
// ==========================================

export const saveReminderTime = async (patientId, reminderTime, enabled = true) => {
  if (isFirebaseEnabled) {
    await setDoc(doc(db, 'reminders', patientId), { reminderTime, enabled });
  } else {
    mockReminders[patientId] = { reminderTime, enabled };
    await syncMockDb(SECURE_STORE_REMINDERS_KEY, mockReminders);
  }
};

export const fetchReminderTime = async (patientId) => {
  if (isFirebaseEnabled) {
    const docRef = doc(db, 'reminders', patientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return { reminderTime: '08:00 AM', enabled: true };
  } else {
    return mockReminders[patientId] || { reminderTime: '08:00 AM', enabled: true };
  }
};

// ==========================================
// PATIENT SEARCH BY ID
// ==========================================

export const searchPatientById = async (patientId) => {
  if (isFirebaseEnabled) {
    // NOTE: Only querying by uniqueId to avoid composite index requirement.
    // Role check is done client-side.
    const q = query(
      collection(db, 'users'),
      where('uniqueId', '==', patientId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data();
      // Validate role client-side
      if (userData.role === 'Patient') {
        return userData;
      }
    }
    return null;
  } else {
    // Mock search
    const cleanId = patientId.trim().toUpperCase();
    const patient = mockUsersDatabase[cleanId];
    if (patient && patient.role === 'Patient') {
      return patient;
    }
    return null;
  }
};
