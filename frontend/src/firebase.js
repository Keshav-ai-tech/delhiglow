import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

let app = null;
let auth = null;
let isFirebaseClientActive = false;

// We need at least an apiKey to initialize Firebase Web SDK
if (firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    isFirebaseClientActive = true;
    console.log('⚡ Firebase Client initialized successfully.');
  } catch (error) {
    console.error('✕ Failed to initialize Firebase Client SDK:', error.message);
  }
} else {
  console.warn('⚠️ REACT_APP_FIREBASE_API_KEY is not defined. Firebase Client Auth will not be active.');
}

export { auth, isFirebaseClientActive };
