const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

let db = null;
let auth = null;
let isFirebaseActive = false;

// 1. Try to load config from environment variables
const projectId = process.env.FIREBASE_PROJECT_ID || 'delhi-glow';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// 2. Try to load config from local credentials file
const localCredsPath = path.join(__dirname, 'firebase-service-account.json');

try {
  if (clientEmail && privateKey) {
    const app = admin.initializeApp({
      credential: admin.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'), // format newline chars in private key
      })
    });
    db = getFirestore(app, 'delhiglow');
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log('⚡ Firebase Admin initialized via environment variables.');
  } else if (fs.existsSync(localCredsPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(localCredsPath, 'utf8'));
    const app = admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    db = getFirestore(app, 'delhiglow');
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log(`⚡ Firebase Admin initialized via local credentials file (${path.basename(localCredsPath)}).`);
  } else {
    // Graceful Fallback Mode: Log warning, but do not crash.
    console.warn('⚠️ Firebase configuration (credentials file or environment variables) not found.');
    console.warn('⚠️ DelhiGlow API is running in Graceful Fallback Mode (using local JSON database).');
  }
} catch (error) {
  console.error('✕ Failed to initialize Firebase Admin SDK:', error.message);
  console.warn('⚠️ Running in local JSON database fallback mode due to initialization failure.');
}

module.exports = {
  admin,
  db,
  auth,
  isFirebaseActive
};
