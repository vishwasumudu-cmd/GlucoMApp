import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// Place your production Firebase configuration here.
// If any value is left as default, the application will automatically
// run in Mock Mode, saving all data locally so it remains fully interactive.
const firebaseConfig = {
  apiKey: "AIzaSyCaa130FkzoWCkkfSSpykfvdQNTwX-pexI",
  authDomain: "glucomapp-72156.firebaseapp.com",
  databaseURL: "https://glucomapp-72156-default-rtdb.firebaseio.com/",
  projectId: "glucomapp-72156",
  storageBucket: "glucomapp-72156.firebasestorage.app",
  messagingSenderId: "908641640099",
  appId: "1:908641640099:web:817023c1ce9c48ce47e916",
};

let app;
let auth = null;
let db = null;
let rtdb = null;
let isFirebaseEnabled = false;

// Simple validation to check if the credentials have been replaced
const isConfigValid =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    try {
      rtdb = getDatabase(app);
    } catch (e) {
      console.warn("Firebase Realtime Database failed to initialize:", e);
    }
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error(
      "Firebase initialization failed. Falling back to Mock Database Mode:",
      error,
    );
  }
} else {
  console.log(
    "Using Mock Database Mode. Please provide real credentials in src/firebase/config.js for production Firebase sync.",
  );
}

export { auth, db, isFirebaseEnabled, rtdb };
export default firebaseConfig;
