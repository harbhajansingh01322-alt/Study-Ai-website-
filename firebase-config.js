/**
 * StudyAI Firebase + Gemini Configuration
 *
 * SETUP:
 * 1. Firebase Console → create project → enable Auth (Email + Google), Firestore, Storage
 * 2. Paste your config below and set ENABLED = true
 * 3. Gemini: https://aistudio.google.com/apikey → paste key in AI Assistant settings or here
 */

const FIREBASE_ENABLED = false; // set true after adding real config

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Load Firebase only when enabled and config is real
(function initFirebase() {
  if (!FIREBASE_ENABLED || firebaseConfig.apiKey === "YOUR_API_KEY") return;
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded. Add script tags in HTML.');
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    window.firebaseAuth = firebase.auth();
    window.firebaseDB = firebase.firestore();
    window.firebaseStorage = firebase.storage();
    window.GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
    console.log('Firebase initialized');
  } catch (e) {
    console.error('Firebase init error:', e);
  }
})();

window.GEMINI_DEFAULT_KEY = ''; // optional: paste default Gemini API key here
window.FIREBASE_ENABLED = FIREBASE_ENABLED;
