const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const { admin, db, auth, isFirebaseActive } = require('./firebase-admin');
const { sendWelcomeEmail, sendPasswordResetEmail, sendBookingNotifications } = require('./email-service');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Middleware to prepend /api on Vercel where the routePrefix is automatically stripped
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
    next();
  });
}

const getDatabasePath = (filename) => {
  const paths = [
    path.join(__dirname, filename),
    path.join(process.cwd(), 'backend', filename),
    path.join(__dirname, '..', 'backend', filename),
    path.join('/var/task/backend', filename)
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
};

const DB_PATH = getDatabasePath('salons.json');
const BOOKINGS_PATH = getDatabasePath('bookings.json');
const USERS_PATH = getDatabasePath('users.json');
const REVIEWS_PATH = getDatabasePath('reviews.json');
const PROFILES_PATH = getDatabasePath('profiles.json');
const CONTACTS_PATH = getDatabasePath('contacts.json');
const PARTNERS_PATH = getDatabasePath('partners.json');
const NEWSLETTER_PATH = getDatabasePath('newsletter.json');
const BEAUTY_PROFILE_PATH = getDatabasePath('beautyprofile.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const safeWriteFileSync = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content);
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to write to ${path.basename(filePath)} (expected on read-only environments like Vercel):`, err.message);
  }
};

// Initialize files if they don't exist
if (!fs.existsSync(DB_PATH)) {
  safeWriteFileSync(DB_PATH, JSON.stringify([]));
}
if (!fs.existsSync(BOOKINGS_PATH)) {
  safeWriteFileSync(BOOKINGS_PATH, JSON.stringify([]));
}
// Initialize in-memory users cache; auto-create users.json on local fallback mode to preserve registrations
if (!fs.existsSync(USERS_PATH) && !isFirebaseActive) {
  safeWriteFileSync(USERS_PATH, JSON.stringify([]));
}
let usersMemory = [];
if (fs.existsSync(USERS_PATH)) {
  try {
    usersMemory = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch (e) {
    usersMemory = [];
  }
}
if (!fs.existsSync(REVIEWS_PATH)) {
  safeWriteFileSync(REVIEWS_PATH, JSON.stringify([]));
}
if (!fs.existsSync(PROFILES_PATH)) {
  safeWriteFileSync(PROFILES_PATH, JSON.stringify([]));
}
if (!fs.existsSync(CONTACTS_PATH)) {
  safeWriteFileSync(CONTACTS_PATH, JSON.stringify([]));
}
if (!fs.existsSync(PARTNERS_PATH)) {
  safeWriteFileSync(PARTNERS_PATH, JSON.stringify([]));
}
if (!fs.existsSync(NEWSLETTER_PATH)) {
  safeWriteFileSync(NEWSLETTER_PATH, JSON.stringify([]));
}
if (!fs.existsSync(BEAUTY_PROFILE_PATH)) {
  safeWriteFileSync(BEAUTY_PROFILE_PATH, JSON.stringify([]));
}
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.warn(`⚠️ Warning: Failed to create uploads directory ${UPLOADS_DIR}:`, err.message);
  }
}


app.use('/api/uploads', express.static(UPLOADS_DIR));

// Memory cache of the last synced state of each Firestore collection to optimize synchronization
const lastSyncedState = {};

// Default pre-seeded owner names fallback map for local fallback mode
const DEFAULT_OWNER_MAP = {
  1: 'Devika Sen',            // Aaradhya Bridal Studio
  2: 'Devika Sen',            // Aaradhya Bridal Studio (owner_id)
  1002: 'Ananya Roy',         // Gloss & Glory Salon
  1003: 'Kavita Malhotra',    // The Luxe Vanity
  1004: 'Priyanka Sharma',    // Shehnai Bridal Lounge
  1005: 'Riya Gupta',         // Bloom Beauty Bar
  1006: 'Aditya Singhal',     // Opulence Salon & Spa
  1781984214911: 'Alan Baker', // Royal Salon
  1782057898133: 'Vikram Mehta', // The Imperial Spa & Salon
  1782058748238: 'Vikram Mehta', // The Imperial Spa & Salon
  1782063095536: 'Alan Baker',   // Royal Salon
  1782063313813: 'Vikram Mehta'  // The Imperial Spa & Salon
};

// Helper to decode a Firebase ID token payload when the Admin SDK is not fully active (for development fallback)
const decodeFirebaseTokenFallback = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && payload.iss && payload.iss.includes('securetoken.google.com')) {
        return {
          uid: payload.user_id || payload.sub,
          email: payload.email,
          name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User')
        };
      }
    }
  } catch (e) {
    // Ignore and return null
  }
  return null;
};

// Background Firestore synchronization helper (optimized with difference-based sync)
const syncCollectionToFirestore = async (collectionName, dataArray, idKey = 'id') => {
  if (!isFirebaseActive || !db) return;
  try {
    const collectionRef = db.collection(collectionName);
    const previous = lastSyncedState[collectionName] || [];
    
    const prevMap = new Map(previous.map(item => [String(item[idKey]), item]));
    const currMap = new Map(dataArray.map(item => [String(item[idKey]), item]));
    
    const batch = db.batch();
    let operationsCount = 0;
    
    // Find additions and modifications
    for (const [id, item] of currMap.entries()) {
      const prevItem = prevMap.get(id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        batch.set(collectionRef.doc(id), item);
        operationsCount++;
      }
    }
    
    // Find deletions
    for (const id of prevMap.keys()) {
      if (!currMap.has(id)) {
        batch.delete(collectionRef.doc(id));
        operationsCount++;
      }
    }
    
    if (operationsCount > 0) {
      await batch.commit();
      console.log(`⚡ Synced collection '${collectionName}' to Firestore (${operationsCount} operations committed).`);
    }
    
    // Cache the updated state locally
    lastSyncedState[collectionName] = JSON.parse(JSON.stringify(dataArray));
  } catch (error) {
    console.error(`✕ Error syncing collection '${collectionName}' to Firestore:`, error.message);
  }
};

// Seeding/Syncing helper on startup (optimized with parallel loading)
const initializeFirebaseSync = async () => {
  if (!isFirebaseActive || !db) {
    console.warn('⚠️ Firebase is not active. Running in local JSON database fallback mode.');
    return;
  }
  
  console.log('⚡ Initializing Firebase sync...');
  
  const collections = [
    { name: 'salons', path: DB_PATH, idKey: 'id' },
    { name: 'bookings', path: BOOKINGS_PATH, idKey: 'id' },
    { name: 'users', path: USERS_PATH, idKey: 'id' },
    { name: 'reviews', path: REVIEWS_PATH, idKey: 'id' },
    { name: 'profiles', path: PROFILES_PATH, idKey: 'user_id' },
    { name: 'contacts', path: CONTACTS_PATH, idKey: 'id' },
    { name: 'partners', path: PARTNERS_PATH, idKey: 'id' },
    { name: 'newsletter', path: NEWSLETTER_PATH, idKey: 'id' },
    { name: 'beautyprofile', path: BEAUTY_PROFILE_PATH, idKey: 'user_id' }
  ];
  
  // Run all database fetches concurrently
  await Promise.all(collections.map(async (col) => {
    try {
      const snapshot = await db.collection(col.name).get();
      if (snapshot.empty) {
        // Firestore collection is empty, seed it from local JSON file
        console.log(`🌱 Firestore collection '${col.name}' is empty. Seeding from local JSON...`);
        let localData = [];
        if (col.name === 'users') {
          localData = usersMemory;
        } else if (fs.existsSync(col.path)) {
          localData = JSON.parse(fs.readFileSync(col.path, 'utf8'));
        }
        if (localData && localData.length > 0) {
          lastSyncedState[col.name] = [];
          await syncCollectionToFirestore(col.name, localData, col.idKey);
        }
      } else {
        // Firestore has data, sync it to local JSON file
        console.log(`📥 Firestore collection '${col.name}' has data. Syncing to local JSON...`);
        const remoteData = [];
        snapshot.forEach(doc => {
          remoteData.push(doc.data());
        });
        
        // Sort the remote data by their ID to keep it consistent
        remoteData.sort((a, b) => {
          const valA = a[col.idKey];
          const valB = b[col.idKey];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return valA - valB;
          }
          return String(valA).localeCompare(String(valB));
        });
        
        if (col.name === 'users') {
          usersMemory = remoteData;
        }
        
        if (col.name !== 'users' || fs.existsSync(col.path)) {
          safeWriteFileSync(col.path, JSON.stringify(remoteData, null, 2));
        }
        
        // Cache the remote state in memory
        lastSyncedState[col.name] = JSON.parse(JSON.stringify(remoteData));
        console.log(`✅ Synced ${remoteData.length} items from Firestore '${col.name}' to local JSON.`);
      }
    } catch (error) {
      console.error(`✕ Error initializing sync for collection '${col.name}':`, error.message);
    }
  }));
};

const preseededImageMap = {
  '/uploads/aaradhya_1.jpg': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
  '/uploads/aaradhya_2.jpg': 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800',
  '/uploads/gloss_1.jpg': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
  '/uploads/gloss_2.jpg': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',
  '/uploads/luxe_1.jpg': 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
  '/uploads/luxe_2.jpg': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
  '/uploads/shehnai_1.jpg': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
  '/uploads/shehnai_2.jpg': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
  '/uploads/bloom_1.jpg': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
  '/uploads/bloom_2.jpg': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
  '/uploads/opulence_1.jpg': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
  '/uploads/opulence_2.jpg': 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800'
};

const readSalons = () => {
  const salons = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  return salons.map(s => {
    if (s.starting_price === undefined || s.starting_price === null) {
      const prices = s.services && s.services.length > 0 ? s.services.map(svc => svc.price) : [];
      s.starting_price = prices.length > 0 ? Math.min(...prices) : 0;
    }
    
    // Map preseeded image paths to Unsplash URLs
    if (s.images) {
      s.images = s.images.map(img => preseededImageMap[img] || img);
    }
    if (s.photos) {
      s.photos = s.photos.map(p => preseededImageMap[p] || p);
    }
    
    // Resolve single s.image field for cards and previews
    if (!s.image && s.images && s.images.length > 0) {
      s.image = s.images[0];
    } else if (s.image) {
      s.image = preseededImageMap[s.image] || s.image;
    }
    
    return s;
  });
};
const writeSalons = (data) => {
  safeWriteFileSync(DB_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('salons', data, 'id');
};
const readBookings = () => JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf8'));
const writeBookings = (data) => {
  safeWriteFileSync(BOOKINGS_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('bookings', data, 'id');
};
const readUsers = () => usersMemory;
const writeUsers = (data) => {
  usersMemory = data;
  if (fs.existsSync(USERS_PATH) || !isFirebaseActive) {
    safeWriteFileSync(USERS_PATH, JSON.stringify(data, null, 2));
  }
  syncCollectionToFirestore('users', data, 'id');
};
const readReviews = () => JSON.parse(fs.readFileSync(REVIEWS_PATH, 'utf8'));
const writeReviews = (data) => {
  safeWriteFileSync(REVIEWS_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('reviews', data, 'id');
};
const readProfiles = () => JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
const writeProfiles = (data) => {
  safeWriteFileSync(PROFILES_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('profiles', data, 'user_id');
};
const readContacts = () => JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf8'));
const writeContacts = (data) => {
  safeWriteFileSync(CONTACTS_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('contacts', data, 'id');
};
const readPartners = () => JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf8'));
const writePartners = (data) => {
  safeWriteFileSync(PARTNERS_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('partners', data, 'id');
};
const readNewsletter = () => JSON.parse(fs.readFileSync(NEWSLETTER_PATH, 'utf8'));
const writeNewsletter = (data) => {
  safeWriteFileSync(NEWSLETTER_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('newsletter', data, 'id');
};
const readBeautyProfiles = () => JSON.parse(fs.readFileSync(BEAUTY_PROFILE_PATH, 'utf8'));
const writeBeautyProfiles = (data) => {
  safeWriteFileSync(BEAUTY_PROFILE_PATH, JSON.stringify(data, null, 2));
  syncCollectionToFirestore('beautyprofile', data, 'user_id');
};

const isDayClosed = (dateStr, closedOnStr) => {
  if (!dateStr || !closedOnStr) return false;
  const closedLower = closedOnStr.toLowerCase().trim();
  if (closedLower === 'none' || closedLower === '') return false;
  
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[d.getDay()];
    return closedLower.includes(dayName);
  } catch (e) {
    return false;
  }
};

// Date & Booking review helpers
const parseAppointmentDateTime = (dateStr, timeStr) => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return new Date(`${dateStr}T12:00:00`);
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch (e) {
    return new Date(dateStr);
  }
};

const getBookingCompletionDetails = (booking, reviews) => {
  if (booking.status === 'cancelled') {
    return { isCompleted: false, isReviewable: false, status: 'cancelled', isReviewed: false };
  }

  if (booking.reviewDismissed === true) {
    return { isCompleted: true, isReviewable: false, status: 'dismissed', isReviewed: false };
  }

  const isReviewed = reviews.some(r => r.booking_id === booking.id);

  let completionDate = null;
  let isCompleted = false;

  if (booking.status === 'completed') {
    isCompleted = true;
    completionDate = booking.completed_at ? new Date(booking.completed_at) : parseAppointmentDateTime(booking.date, booking.time);
  } else if (booking.status === 'confirmed') {
    const apptDateTime = parseAppointmentDateTime(booking.date, booking.time);
    if (apptDateTime < new Date()) {
      isCompleted = true;
      completionDate = apptDateTime;
    }
  }

  if (!isCompleted) {
    return { isCompleted: false, isReviewable: false, status: 'upcoming', isReviewed };
  }

  if (isReviewed) {
    return { isCompleted: true, isReviewable: false, status: 'reviewed', isReviewed, completionDate };
  }

  const now = new Date();
  const diffTime = now - completionDate;
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const isExpired = diffTime > fiveDaysMs;

  return {
    isCompleted: true,
    isReviewable: !isExpired,
    status: isExpired ? 'expired' : 'reviewable',
    isReviewed,
    completionDate,
    expiresInMs: isExpired ? 0 : fiveDaysMs - diffTime
  };
};

// Password encryption helpers
const hashPassword = (password, salt) => {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
};

const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Base64 Token Helper (Simulating stateless JWT for simplicity and zero dependencies)
const generateToken = (user) => {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    salon_id: user.salon_id || null
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  
  let decodedToken = null;
  if (isFirebaseActive && auth) {
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      decodedToken = decodeFirebaseTokenFallback(token);
    }
  } else {
    decodedToken = decodeFirebaseTokenFallback(token);
  }
  
  if (decodedToken) {
    try {
      const users = readUsers();
      let user = users.find(u => String(u.id) === String(decodedToken.uid) || u.email.toLowerCase() === decodedToken.email.toLowerCase());
      
      if (!user) {
        // Auto-provision user record in database if authenticated via Firebase but missing in our collection
        const emailLower = decodedToken.email.toLowerCase();
        const salons = readSalons();
        const matchedSalon = salons.find(s => s.email && s.email.toLowerCase() === emailLower);
        const isOwnerEmail = emailLower.includes('owner') || !!matchedSalon;
        const role = isOwnerEmail ? 'owner' : 'customer';
        const salonId = matchedSalon ? matchedSalon.id : null;

        user = {
          id: decodedToken.uid,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          email: decodedToken.email.toLowerCase(),
          phone: '',
          passwordHash: '',
          salt: '',
          role: role,
          salon_id: salonId,
          welcomeEmailSent: true,
          notifications: { email: true, sms: false, whatsapp: true }
        };

        // Find existing beauty profile if any
        const beautyProfiles = readBeautyProfiles();
        const bp = beautyProfiles.find(p => String(p.user_id) === String(decodedToken.uid));
        if (bp) {
          const { user_id, updated_at, ...profileData } = bp;
          user.beautyProfile = profileData;
        }

        users.push(user);
        writeUsers(users);

        // Send welcome email asynchronously
        sendWelcomeEmail(user.email, user.name, role).catch(e => {
          console.error('Failed to send welcome email during auto-provisioning:', e.message);
        });
        
        // Also auto-provision profile record
        const profiles = readProfiles();
        const newProfile = {
          user_id: user.id,
          bio: 'DelhiGlow Customer Connoisseur.',
          gender: 'Not specified',
          avatar: '',
          updated_at: new Date().toISOString()
        };
        profiles.push(newProfile);
        writeProfiles(profiles);
      }
      
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email.toLowerCase(),
        role: user.role,
        salon_id: user.salon_id || null
      };
      return next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }
  } else {
    // If not a Firebase token, try reading as local token (base64)
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      req.user = payload;
      return next();
    } catch (localErr) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }
  }
};

// GET all salons (with optional filters) - PUBLIC
app.get('/api/salons', async (req, res) => {
  let salons = readSalons();
  const { area, tag, search, sort } = req.query;

  // Filter out salons that are inactive (not onboarded yet)
  salons = salons.filter(s => s.active !== false);

  const users = readUsers();
  
  // Parse optional auth token to compute beauty profile match %
  let beautyProfile = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      let decodedToken = null;
      if (isFirebaseActive && auth) {
        try {
          decodedToken = await auth.verifyIdToken(token);
        } catch (firebaseErr) {
          decodedToken = decodeFirebaseTokenFallback(token);
        }
      } else {
        decodedToken = decodeFirebaseTokenFallback(token);
      }

      if (decodedToken) {
        const user = users.find(u => String(u.id) === String(decodedToken.uid) || u.email.toLowerCase() === decodedToken.email.toLowerCase());
        if (user && user.beautyProfile) {
          beautyProfile = user.beautyProfile;
        }
      } else {
        // Local base64 token parsing fallback
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        const user = users.find(u => String(u.id) === String(payload.id));
        if (user && user.beautyProfile) {
          beautyProfile = user.beautyProfile;
        }
      }
    } catch (e) {
      console.warn('Optional auth token parsing failed in GET /api/salons:', e.message);
    }
  }

  salons = salons.map(s => {
    const owner = users.find(u => u.role === 'owner' && String(u.salon_id) === String(s.id));
    const owner_name = owner ? owner.name : (DEFAULT_OWNER_MAP[s.id] || DEFAULT_OWNER_MAP[s.owner_id] || null);
    let match_pct = null;

    if (beautyProfile) {
      let score = 0;
      let totalWeights = 0;

      // 1. Vibes Match (Weight: 35)
      if (beautyProfile.vibes && beautyProfile.vibes.length > 0) {
        totalWeights += 35;
        let matchedVibes = 0;
        beautyProfile.vibes.forEach(vibe => {
          if (vibe.includes('Facial') && (s.tags.includes('Skin') || s.tags.includes('Anti-Aging') || s.about.toLowerCase().includes('facial') || s.services.some(svc => svc.name.toLowerCase().includes('facial') || svc.name.toLowerCase().includes('clean-up')))) {
            matchedVibes++;
          } else if (vibe.includes('Hair') && (s.tags.includes('Hair') || s.about.toLowerCase().includes('hair') || s.services.some(svc => svc.name.toLowerCase().includes('hair') || svc.name.toLowerCase().includes('cut') || svc.name.toLowerCase().includes('style') || svc.name.toLowerCase().includes('blow')))) {
            matchedVibes++;
          } else if (vibe.includes('Bridal') && (s.tags.includes('Bridal') || s.tags.includes('Traditional') || s.about.toLowerCase().includes('bridal') || s.services.some(svc => svc.name.toLowerCase().includes('bridal') || svc.name.toLowerCase().includes('mehendi')))) {
            matchedVibes++;
          } else if (vibe.includes('Spa') && (s.tags.includes('Spa') || s.about.toLowerCase().includes('spa') || s.services.some(svc => svc.name.toLowerCase().includes('massage') || svc.name.toLowerCase().includes('spa') || svc.name.toLowerCase().includes('polish')))) {
            matchedVibes++;
          } else if (vibe.includes('Nail') && (s.tags.includes('Nail Art') || s.about.toLowerCase().includes('nail') || s.services.some(svc => svc.name.toLowerCase().includes('nail') || svc.name.toLowerCase().includes('manicure') || svc.name.toLowerCase().includes('pedicure')))) {
            matchedVibes++;
          }
        });
        const vibeRatio = matchedVibes / beautyProfile.vibes.length;
        score += vibeRatio * 35;
      }

      // 2. Budget Match (Weight: 30)
      if (beautyProfile.budget) {
        totalWeights += 30;
        const b = beautyProfile.budget;
        const sp = s.starting_price;
        let budgetMatch = 0;
        if (b.includes('500') && !b.includes('1,500')) {
          if (sp < 1000) budgetMatch = 1.0;
          else if (sp <= 2000) budgetMatch = 0.5;
        } else if (b.includes('500 – ₹1,500') || b.includes('500 - 1500')) {
          if (sp >= 500 && sp <= 1800) budgetMatch = 1.0;
          else if (sp < 500 || sp <= 2500) budgetMatch = 0.6;
        } else if (b.includes('1,500 – ₹3,000') || b.includes('1500 - 3000')) {
          if (sp >= 1500 && sp <= 3500) budgetMatch = 1.0;
          else if (sp >= 800 && sp <= 5000) budgetMatch = 0.5;
        } else if (b.includes('3,000+')) {
          if (sp >= 2500 || s.price_range === '₹₹₹' || s.price_range === '₹₹₹₹') budgetMatch = 1.0;
          else if (sp >= 1500) budgetMatch = 0.5;
        }
        score += budgetMatch * 30;
      }

      // 3. Environment Match (Weight: 20)
      if (beautyProfile.environment) {
        totalWeights += 20;
        const env = beautyProfile.environment;
        let envMatch = 0.2; // base
        if (env.toLowerCase().includes('homely') || env.toLowerCase().includes('community') || env.toLowerCase().includes('parlour')) {
          if (s.tags.includes('Affordable') || s.starting_price < 2000) envMatch = 1.0;
        } else if (env.toLowerCase().includes('luxury') || env.toLowerCase().includes('zen') || env.toLowerCase().includes('spa')) {
          if (s.tags.includes('Spa') || s.tags.includes('Luxury') || s.price_range === '₹₹₹₹') envMatch = 1.0;
        } else if (env.toLowerCase().includes('chic') || env.toLowerCase().includes('modern')) {
          if (s.tags.includes('Luxury') || s.tags.includes('Nail Art') || s.tags.includes('Hair')) envMatch = 1.0;
        } else if (env.toLowerCase().includes('high-energy') || env.toLowerCase().includes('buzzing')) {
          if (s.tags.includes('Bridal') || s.tags.includes('Skin')) envMatch = 1.0;
        }
        score += envMatch * 20;
      }

      // 4. Distance Match (Weight: 15)
      if (beautyProfile.distance) {
        totalWeights += 15;
        const dist = beautyProfile.distance;
        let distMatch = 1.0;
        if (dist.toLowerCase().includes('2 km')) {
          if (s.area.toLowerCase() === 'south delhi' || s.location.toLowerCase().includes('defence colony') || s.location.toLowerCase().includes('gk')) {
            distMatch = 1.0;
          } else {
            distMatch = 0.4;
          }
        } else if (dist.toLowerCase().includes('5 km')) {
          if (s.area.toLowerCase() === 'south delhi' || s.area.toLowerCase() === 'central delhi') {
            distMatch = 1.0;
          } else {
            distMatch = 0.7;
          }
        }
        score += distMatch * 15;
      }

      const pct = totalWeights > 0 ? Math.round((score / totalWeights) * 100) : 85;
      match_pct = Math.max(60, Math.min(99, pct));
    }

    return {
      ...s,
      owner_name,
      match_pct
    };
  });

  if (area) salons = salons.filter(s => s.area.toLowerCase() === area.toLowerCase());
  if (tag) salons = salons.filter(s => s.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
  if (search) {
    const q = search.toLowerCase();
    salons = salons.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.speciality.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      (s.services && s.services.some(svc => svc.name.toLowerCase().includes(q)))
    );
  }

  if (sort === 'rating') salons.sort((a, b) => b.rating - a.rating);
  if (sort === 'price_low') salons.sort((a, b) => a.starting_price - b.starting_price);
  if (sort === 'price_high') salons.sort((a, b) => b.starting_price - a.starting_price);
  if (sort === 'reviews') salons.sort((a, b) => b.reviews - a.reviews);
  if (sort === 'match' && beautyProfile) {
    salons.sort((a, b) => (b.match_pct || 0) - (a.match_pct || 0));
  }

  res.json({ success: true, count: salons.length, data: salons });
});

// GET single salon by ID - PUBLIC
app.get('/api/salons/:id', (req, res) => {
  const salons = readSalons();
  const salon = salons.find(s => s.id === parseInt(req.params.id));
  if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });
  
  const users = readUsers();
  const owner = users.find(u => u.role === 'owner' && String(u.salon_id) === String(salon.id));
  const salonWithOwner = {
    ...salon,
    owner_name: owner ? owner.name : (DEFAULT_OWNER_MAP[salon.id] || DEFAULT_OWNER_MAP[salon.owner_id] || null)
  };
  
  res.json({ success: true, data: salonWithOwner });
});

// GET all unique areas - PUBLIC
app.get('/api/areas', (req, res) => {
  const salons = readSalons();
  const areas = [...new Set(salons.map(s => s.area))];
  res.json({ success: true, data: areas });
});

// GET all unique tags - PUBLIC
app.get('/api/tags', (req, res) => {
  const salons = readSalons();
  const tags = [...new Set(salons.flatMap(s => s.tags))];
  res.json({ success: true, data: tags });
});

// POST create a booking - Requires Customer/Owner/Staff
app.post('/api/bookings', (req, res) => {
  const { salon_id, salon_name, service, date, time, name, phone, email, price, duration } = req.body;

  if (!salon_id || !service || !date || !time || !name || !phone) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields' });
  }

  const salons = readSalons();
  const salon = salons.find(s => s.id === parseInt(salon_id));
  if (salon && isDayClosed(date, salon.closed_on)) {
    return res.status(400).json({ 
      success: false, 
      message: `The sanctuary is closed on this day (${salon.closed_on}). Please choose another date.` 
    });
  }

  const bookings = readBookings();
  const newBooking = {
    id: Date.now(),
    salon_id: parseInt(salon_id),
    salon_name,
    service,
    date,
    time,
    name,
    phone,
    email: email || '',
    price: price || 0,
    duration: duration || '',
    status: 'confirmed',
    created_at: new Date().toISOString()
  };

  bookings.push(newBooking);
  writeBookings(bookings);

  // Trigger notification asynchronously
  sendBookingNotifications(newBooking, 'create', {}, readUsers()).catch(err => {
    console.error('✕ Failed to send booking creation notifications:', err.message);
  });

  res.status(201).json({
    success: true,
    message: 'Booking confirmed!',
    data: newBooking
  });
});

// ================= AUTH API =================

// POST User Registration (Customer and Vendor Owner)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role, salonName, area, location, speciality, timings } = req.body;

  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ success: false, message: 'All authentication fields are required' });
  }

  const users = readUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
  }

  let userId = Date.now() + 1;
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  
  // If Firebase is active and auth header is provided with ID token, use its uid
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    let decodedToken = null;
    if (isFirebaseActive && auth) {
      try {
        decodedToken = await auth.verifyIdToken(token);
      } catch (e) {
        console.error('Failed to verify token in registration:', e.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired Firebase ID token during registration' });
      }
    } else {
      decodedToken = decodeFirebaseTokenFallback(token);
    }
    if (decodedToken) {
      userId = decodedToken.uid;
    }
  }

  let salonId = null;

  // Onboard new vendor salon profile if registering as Owner
  if (role === 'owner') {
    if (!salonName) {
      return res.status(400).json({ success: false, message: 'Salon details are required for owner registration' });
    }
    const salons = readSalons();
    salonId = Date.now();
    
    const newSalon = {
      id: salonId,
      name: salonName,
      active: false, // Hidden until setup wizard completed
      staff_can_reply: false, // Default permissions
      area: area || 'South Delhi',
      location: location || 'New Delhi',
      rating: 5.0,
      reviews: 0,
      price_range: '₹₹₹',
      starting_price: 0,
      image: '',
      tags: ['Luxury', speciality || 'Beauty'],
      speciality: speciality || 'Bridal & Beauty',
      about: `Welcome to ${salonName}, a boutique luxury sanctuary handpicked for DelhiGlow.`,
      services: [], // Empty catalog to force onboarding setup
      timings: timings || '10:00 AM – 8:00 PM',
      closed_on: 'None',
      contact: phone,
      photos: []
    };

    salons.push(newSalon);
    writeSalons(salons);
  }

  const newUser = {
    id: userId,
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    salt,
    role, // 'customer' or 'owner'
    salon_id: salonId,
    welcomeEmailSent: true,
    notifications: { email: true, sms: false, whatsapp: true }
  };

  users.push(newUser);
  writeUsers(users);

  // Send welcome email asynchronously
  sendWelcomeEmail(newUser.email, newUser.name, newUser.role, salonName).catch(e => {
    console.error('Failed to send welcome email during registration:', e.message);
  });

  // Auto-create profile record on registration
  const profiles = readProfiles();
  const newProfile = {
    user_id: newUser.id,
    bio: `DelhiGlow ${newUser.role === 'owner' ? 'Salon Partner' : newUser.role === 'staff' ? 'Staff Specialist' : 'Customer Connoisseur'}.`,
    gender: 'Not specified',
    avatar: '',
    updated_at: new Date().toISOString()
  };
  profiles.push(newProfile);
  writeProfiles(profiles);

  // Generate appropriate token (Firebase token or local base64 token)
  let token;
  if (isFirebaseActive && auth && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = generateToken(newUser);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful!',
    data: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      salon_id: newUser.salon_id,
      avatar: '',
      token
    }
  });
});

// POST User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const authHeader = req.headers.authorization;

  // If Firebase is active and auth header is provided, log in using the ID token
  let decodedToken = null;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    if (isFirebaseActive && auth) {
      try {
        decodedToken = await auth.verifyIdToken(token);
      } catch (e) {
        console.error('Firebase token verification failed on login:', e.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired Firebase ID token' });
      }
    } else {
      decodedToken = decodeFirebaseTokenFallback(token);
    }
  }

  if (decodedToken) {
    const users = readUsers();
    let user = users.find(u => String(u.id) === String(decodedToken.uid) || u.email.toLowerCase() === decodedToken.email.toLowerCase());
    
    if (!user) {
      // Create a default user in our DB if they exist in Firebase Auth but not locally yet
      const userId = decodedToken.uid;
      const emailLower = decodedToken.email.toLowerCase();
      const salons = readSalons();
      const matchedSalon = salons.find(s => s.email && s.email.toLowerCase() === emailLower);
      const isOwnerEmail = emailLower.includes('owner') || !!matchedSalon;
      const role = isOwnerEmail ? 'owner' : 'customer';
      const salonId = matchedSalon ? matchedSalon.id : null;

      user = {
        id: userId,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        email: decodedToken.email.toLowerCase(),
        phone: '',
        passwordHash: '',
        salt: '',
        role: role,
        salon_id: salonId,
        welcomeEmailSent: true,
        notifications: { email: true, sms: false, whatsapp: true }
      };

      // Find existing beauty profile if any
      const beautyProfiles = readBeautyProfiles();
      const bp = beautyProfiles.find(p => String(p.user_id) === String(userId));
      if (bp) {
        const { user_id, updated_at, ...profileData } = bp;
        user.beautyProfile = profileData;
      }

      users.push(user);
      writeUsers(users);

      // Send welcome email asynchronously
      sendWelcomeEmail(user.email, user.name, role).catch(e => {
        console.error('Failed to send welcome email during login auto-provisioning:', e.message);
      });
    } else if (String(user.id) !== String(decodedToken.uid)) {
      // Update user ID to be the uid for consistency
      const oldId = user.id;
      user.id = decodedToken.uid;
      
      // Update references in profiles
      const profiles = readProfiles();
      const profile = profiles.find(p => String(p.user_id) === String(oldId));
      if (profile) profile.user_id = decodedToken.uid;
      writeProfiles(profiles);
      
      // Update references in reviews
      const reviews = readReviews();
      reviews.forEach(r => {
        if (String(r.user_id) === String(oldId)) r.user_id = decodedToken.uid;
      });
      writeReviews(reviews);
      
      writeUsers(users);
    }

    // Auto-generate profile if missing
    const profiles = readProfiles();
    let profile = profiles.find(p => String(p.user_id) === String(user.id));
    if (!profile) {
      profile = {
        user_id: user.id,
        bio: `DelhiGlow ${user.role === 'owner' ? 'Salon Partner' : user.role === 'staff' ? 'Staff Specialist' : 'Customer Connoisseur'}.`,
        gender: 'Not specified',
        avatar: '',
        updated_at: new Date().toISOString()
      };
      profiles.push(profile);
      writeProfiles(profiles);
    }

    return res.json({
      success: true,
      message: 'Welcome back!',
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        salon_id: user.salon_id,
        avatar: profile.avatar || '',
        token
      }
    });
  }

  // Fallback to local password verification
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email address or password' });
  }

  const expectedHash = hashPassword(password, user.salt);
  if (user.passwordHash !== expectedHash) {
    return res.status(400).json({ success: false, message: 'Invalid email address or password' });
  }

  // Auto-generate profile if missing on login
  const profiles = readProfiles();
  let profile = profiles.find(p => String(p.user_id) === String(user.id));
  if (!profile) {
    profile = {
      user_id: user.id,
      bio: `DelhiGlow ${user.role === 'owner' ? 'Salon Partner' : user.role === 'staff' ? 'Staff Specialist' : 'Customer Connoisseur'}.`,
      gender: 'Not specified',
      avatar: '',
      updated_at: new Date().toISOString()
    };
    profiles.push(profile);
    writeProfiles(profiles);
  }

  token = generateToken(user);
  res.json({
    success: true,
    message: 'Welcome back!',
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
      salon_id: user.salon_id,
      avatar: profile.avatar || '',
      token
    }
  });
});

// POST /api/auth/forgot-password - Triggers password reset email with temporary password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ success: false, message: 'No account found with this email address' });
  }

  // Generate an 8-character random temporary password
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tempPassword = '';
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(tempPassword, salt);

  // Update user database
  user.salt = salt;
  user.passwordHash = passwordHash;
  writeUsers(users);

  // Update password in Firebase Auth if active and user is a Firebase user to keep credentials synchronized
  const isFirebaseUser = typeof user.id === 'string' && isNaN(Number(user.id));
  if (isFirebaseActive && auth && isFirebaseUser) {
    try {
      await auth.updateUser(user.id, {
        password: tempPassword
      });
      console.log(`⚡ Password updated in Firebase Auth for UID: ${user.id}`);
    } catch (e) {
      console.warn(`⚠️ Warning: Could not update password in Firebase Auth for user ${user.id}:`, e.message);
    }
  }

  // Send the reset email asynchronously
  sendPasswordResetEmail(user.email, user.name, tempPassword).catch(err => {
    console.error('✕ Failed to send password reset email:', err.message);
  });

  res.json({
    success: true,
    message: 'A temporary reset password has been sent to your registered email address.'
  });
});


// ================= OWNER & STAFF ADMIN API =================

// GET user's salon details
app.get('/api/admin/salon', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied: Administrative privileges required' });
  }

  const salons = readSalons();
  const salon = salons.find(s => s.id === parseInt(req.user.salon_id));
  if (!salon) return res.status(404).json({ success: false, message: 'Associated sanctuary salon not found' });
  
  const users = readUsers();
  const owner = users.find(u => u.role === 'owner' && String(u.salon_id) === String(salon.id));
  const salonWithOwner = {
    ...salon,
    owner_name: owner ? owner.name : (DEFAULT_OWNER_MAP[salon.id] || DEFAULT_OWNER_MAP[salon.owner_id] || null)
  };
  
  res.json({ success: true, data: salonWithOwner });
});

// PUT update salon working hours / metadata
app.put('/api/admin/salon/timings', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { timings, closed_on } = req.body;
  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));

  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  if (timings !== undefined) salons[index].timings = timings;
  if (closed_on !== undefined) salons[index].closed_on = closed_on;

  writeSalons(salons);
  res.json({ success: true, message: 'Sanctuary operating details modified successfully', data: salons[index] });
});

// PUT update salon photos (add/remove photos or set cover)
app.put('/api/admin/salon/photos', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied: Administrative privileges required' });
  }

  const { photos, image } = req.body;
  if (!photos || !Array.isArray(photos)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing photos array' });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  salons[index].photos = photos;
  if (image !== undefined) {
    salons[index].image = image;
  } else if (photos.length > 0 && (!salons[index].image || !photos.includes(salons[index].image))) {
    salons[index].image = photos[0];
  } else if (photos.length === 0) {
    salons[index].image = '';
  }

  writeSalons(salons);
  res.json({ success: true, message: 'Salon photos updated successfully', data: salons[index] });
});

// GET salon bookings (Data isolated: filters by user's salon_id)
app.get('/api/admin/bookings', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const bookings = readBookings();
  const filtered = bookings.filter(b => b.salon_id === parseInt(req.user.salon_id));
  res.json({ success: true, count: filtered.length, data: filtered });
});

// PATCH update booking status
app.patch('/api/admin/bookings/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Missing status update payload' });

  const bookings = readBookings();
  const index = bookings.findIndex(b => b.id === parseInt(req.params.id) && b.salon_id === parseInt(req.user.salon_id));

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Registry item not found for your salon' });
  }

  bookings[index].status = status;
  if (status === 'completed') {
    bookings[index].completed_at = new Date().toISOString();
  }
  writeBookings(bookings);

  // Trigger status update notifications asynchronously
  sendBookingNotifications(bookings[index], 'status', { status }, readUsers()).catch(err => {
    console.error('✕ Failed to send booking status notifications:', err.message);
  });

  res.json({ success: true, message: 'Booking status modified!', data: bookings[index] });
});

// POST Add service to salon (Owner only)
app.post('/api/admin/services', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied: Only salon owners can add services' });
  }

  const { name, price, duration } = req.body;
  if (!name || price === undefined || !duration) {
    return res.status(400).json({ success: false, message: 'Name, price, and duration are required' });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  if (salons[index].services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'A service ritual with this name already exists' });
  }

  const newService = { name, price: parseInt(price), duration };
  salons[index].services.push(newService);

  // Update starting price if applicable
  const prices = salons[index].services.map(s => s.price);
  salons[index].starting_price = Math.min(...prices);

  writeSalons(salons);
  res.status(201).json({ success: true, message: 'Service ritual added to sanctuary catalogue', data: salons[index].services });
});

// PUT Edit service details (Staff restricted: cannot change price)
app.put('/api/admin/services/:name', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const serviceName = req.params.name;
  const { newName, duration, price } = req.body;

  // STRICT RESTRICTION: Block staff from updating service pricing
  if (req.user.role === 'staff' && price !== undefined) {
    return res.status(403).json({ success: false, message: 'Access Denied: Only the salon owner can change service pricing' });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  const serviceIndex = salons[index].services.findIndex(s => s.name.toLowerCase() === serviceName.toLowerCase());
  if (serviceIndex === -1) return res.status(404).json({ success: false, message: 'Service ritual not found' });

  if (newName) salons[index].services[serviceIndex].name = newName;
  if (duration) salons[index].services[serviceIndex].duration = duration;
  
  if (price !== undefined && req.user.role === 'owner') {
    salons[index].services[serviceIndex].price = parseInt(price);
    // Recompute starting price
    const prices = salons[index].services.map(s => s.price);
    salons[index].starting_price = Math.min(...prices);
  }

  writeSalons(salons);
  res.json({ success: true, message: 'Service details modified successfully', data: salons[index].services });
});

// PUT Edit pricing only (Owner only)
app.put('/api/admin/services/:name/price', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access Denied: Only salon owners can edit service pricing' });
  }

  const { price } = req.body;
  if (price === undefined) return res.status(400).json({ success: false, message: 'Price is required' });

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  const serviceIndex = salons[index].services.findIndex(s => s.name.toLowerCase() === req.params.name.toLowerCase());
  if (serviceIndex === -1) return res.status(404).json({ success: false, message: 'Service ritual not found' });

  salons[index].services[serviceIndex].price = parseInt(price);
  
  // Recompute starting price
  const prices = salons[index].services.map(s => s.price);
  salons[index].starting_price = Math.min(...prices);

  writeSalons(salons);
  res.json({ success: true, message: 'Pricing model updated successfully', data: salons[index].services });
});

// DELETE remove a service (Owner only)
app.delete('/api/admin/services/:name', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied: Only salon owners can delete services' });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  const serviceName = req.params.name.toLowerCase();
  salons[index].services = salons[index].services.filter(s => s.name.toLowerCase() !== serviceName);

  // Recompute starting price
  if (salons[index].services.length > 0) {
    const prices = salons[index].services.map(s => s.price);
    salons[index].starting_price = Math.min(...prices);
  }

  writeSalons(salons);
  res.json({ success: true, message: 'Service ritual removed from sanctuary', data: salons[index].services });
});

// GET staff members (Owner only)
app.get('/api/admin/staff', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied: Owner privileges required' });
  }

  const users = readUsers();
  const staff = users.filter(u => u.role === 'staff' && u.salon_id === parseInt(req.user.salon_id));
  
  // Exclude password hashes and salts before sending
  const cleanStaff = staff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone
  }));

  res.json({ success: true, data: cleanStaff });
});

// POST Add staff member (Owner only) - Generates a separate credential password
app.post('/api/admin/staff', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Name, email, and phone contact details are required' });
  }

  const users = readUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'A user account with this email address already exists' });
  }

  // Generate a unique 8-character password for this staff member
  const cleanName = name.replace(/[^a-zA-Z]/g, '');
  const randNum = Math.floor(100 + Math.random() * 900);
  const generatedPassword = `${cleanName}Staff${randNum}`;

  const salt = generateSalt();
  const passwordHash = hashPassword(generatedPassword, salt);

  const newStaff = {
    id: Date.now(),
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    salt,
    role: 'staff',
    salon_id: parseInt(req.user.salon_id),
    notifications: { email: true, sms: false, whatsapp: true }
  };

  users.push(newStaff);
  writeUsers(users);

  res.status(201).json({
    success: true,
    message: 'Staff account created successfully!',
    data: {
      id: newStaff.id,
      name: newStaff.name,
      email: newStaff.email,
      phone: newStaff.phone,
      generatedPassword // Return plain text password ONCE during creation so owner can share it
    }
  });
});

// DELETE remove a staff member (Owner only)
app.delete('/api/admin/staff/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const staffId = parseInt(req.params.id);
  let users = readUsers();

  const userIndex = users.findIndex(u => u.id === staffId && u.role === 'staff' && u.salon_id === parseInt(req.user.salon_id));
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Staff member not found or does not belong to your salon' });
  }

  users.splice(userIndex, 1);
  writeUsers(users);

  res.json({ success: true, message: 'Staff member account terminated successfully' });
});


// ================= UPLOAD AND ONBOARDING FLOW API =================

// POST upload base64 image
app.post('/api/upload', (req, res) => {
  const { name, base64 } = req.body;
  if (!name || !base64) {
    return res.status(400).json({ success: false, message: 'Missing file payload' });
  }

  // Parse mime type and raw base64 data
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ success: false, message: 'Invalid base64 image format' });
  }

  const fileType = matches[1];
  const fileData = Buffer.from(matches[2], 'base64');
  const sizeInMb = fileData.length / (1024 * 1024);

  if (sizeInMb > 5) {
    return res.status(400).json({ success: false, message: 'File size exceeds 5MB limit' });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(fileType)) {
    return res.status(400).json({ success: false, message: 'Allowed file formats: JPG, PNG, WEBP' });
  }

  let ext = 'jpg';
  if (fileType === 'image/png') ext = 'png';
  if (fileType === 'image/webp') ext = 'webp';

  const fileName = `${crypto.randomBytes(8).toString('hex')}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  try {
    fs.writeFileSync(filePath, fileData);
    res.json({
      success: true,
      url: `/api/uploads/${fileName}`
    });
  } catch (err) {
    console.error('File save error:', err);
    res.status(500).json({ success: false, message: 'Failed to save uploaded file' });
  }
});

// PUT complete salon onboarding
app.put('/api/admin/salon/onboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied: Only salon owners can onboard business profiles' });
  }

  const {
    name, area, location, latitude, longitude, contact, email, whatsapp,
    timings, closed_on, services, about, image, photos, city
  } = req.body;

  // Validate all fields
  if (!name || !area || !location || !contact || !email || !timings || !closed_on || !about || !image || !city) {
    return res.status(400).json({ success: false, message: 'All mandatory onboarding fields must be completed' });
  }

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Interactive location coordinates must be set' });
  }

  if (!services || !Array.isArray(services) || services.length < 3) {
    return res.status(400).json({ success: false, message: 'You must add at least 3 services to configure your catalogue' });
  }

  if (!photos || !Array.isArray(photos) || photos.length < 3) {
    return res.status(400).json({ success: false, message: 'You must upload at least 3 photos of your beauty sanctuary' });
  }

  const trimmedAbout = (about || '').trim();
  if (trimmedAbout.length < 150 || trimmedAbout.length > 200) {
    return res.status(400).json({ success: false, message: `Short description/bio must be between 150 and 200 characters (current: ${trimmedAbout.length})` });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Associated salon profile not found' });

  // Update salon
  salons[index] = {
    ...salons[index],
    name,
    area,
    location,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    contact,
    email,
    whatsapp: whatsapp || '',
    timings,
    closed_on,
    services: services.map(s => ({ ...s, price: parseInt(s.price) })),
    about: trimmedAbout,
    image,
    photos,
    city,
    active: true // Go live!
  };

  // Compute starting price
  const prices = salons[index].services.map(s => s.price);
  salons[index].starting_price = Math.min(...prices);

  writeSalons(salons);

  res.json({
    success: true,
    message: 'Salon onboarding completed! Your sanctuary is now live in the marketplace.',
    data: salons[index]
  });
});


// ================= REVIEWS & REPLIES API =================

// GET review eligibility for a customer
app.get('/api/reviews/check-eligibility/:salon_id', authMiddleware, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.json({ eligible: false, message: 'Only registered customers can leave reviews.' });
  }
  const targetSalonId = parseInt(req.params.salon_id);
  const bookings = readBookings();
  const reviews = readReviews();

  const userBookings = bookings.filter(b => 
    b.salon_id === targetSalonId &&
    (b.email.toLowerCase() === req.user.email.toLowerCase() || b.phone === req.user.phone)
  );

  // Sort userBookings by appointment date descending to review the most recent one first
  userBookings.sort((a, b) => {
    const timeA = parseAppointmentDateTime(a.date, a.time);
    const timeB = parseAppointmentDateTime(b.date, b.time);
    return timeB - timeA;
  });

  let eligibleBooking = null;
  for (const b of userBookings) {
    const details = getBookingCompletionDetails(b, reviews);
    if (details.isReviewable) {
      eligibleBooking = b;
      break;
    }
  }

  if (eligibleBooking) {
    return res.json({ eligible: true, booking_id: eligibleBooking.id });
  } else {
    return res.json({ eligible: false, message: 'Review submission requires a completed booking within the last 5 days.' });
  }
});

// GET all reviews for a salon (Public)
app.get('/api/reviews/salon/:salon_id', (req, res) => {
  const reviews = readReviews();
  const salonId = parseInt(req.params.salon_id);

  const salonReviews = reviews.filter(r => r.salon_id === salonId);
  // Sort by date descending
  salonReviews.sort((a, b) => new Date(b.date) - new Date(a.date));

  const count = salonReviews.length;
  const averageRating = count > 0 
    ? parseFloat((salonReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) 
    : 5.0;

  res.json({
    success: true,
    count,
    averageRating,
    data: salonReviews
  });
});

// POST submit a review (Authenticated Customer)
app.post('/api/reviews', authMiddleware, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Only logged-in customers can leave reviews' });
  }

  const { salon_id, booking_id, rating, text, photos } = req.body;
  if (!salon_id || !booking_id || !rating || !text) {
    return res.status(400).json({ success: false, message: 'Missing required review fields' });
  }

  if (parseInt(rating) < 1 || parseInt(rating) > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
  }

  if (text.trim().length < 20) {
    return res.status(400).json({ success: false, message: 'Review commentary must be at least 20 characters' });
  }

  const targetSalonId = parseInt(salon_id);
  const targetBookingId = parseInt(booking_id);

  const bookings = readBookings();
  const booking = bookings.find(b => 
    b.id === targetBookingId && 
    b.email && b.email.toLowerCase() === req.user.email.toLowerCase()
  );

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking registry item not found' });
  }

  if (booking.salon_id !== targetSalonId) {
    return res.status(400).json({ success: false, message: 'Salon ID does not match booking details' });
  }

  const reviews = readReviews();
  const details = getBookingCompletionDetails(booking, reviews);

  if (!details.isCompleted) {
    return res.status(400).json({ success: false, message: 'Review submission requires a completed booking.' });
  }

  if (details.isReviewed) {
    return res.status(400).json({ success: false, message: 'A review has already been submitted for this booking.' });
  }

  if (details.status === 'dismissed') {
    return res.status(400).json({ success: false, message: 'The review option for this booking has been dismissed.' });
  }

  if (details.status === 'expired') {
    return res.status(400).json({ success: false, message: 'The review window for this booking has expired (5 days limit).' });
  }

  // Format name to "First Name + Last Initial"
  const nameParts = req.user.name.split(' ');
  const firstName = nameParts[0];
  const lastInitial = nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : '';
  const formattedName = `${firstName}${lastInitial}`;

  const newReview = {
    id: Date.now(),
    salon_id: targetSalonId,
    booking_id: targetBookingId,
    user_id: req.user.id,
    user_name: formattedName,
    rating: parseInt(rating),
    text: text.trim(),
    photos: photos || [],
    date: new Date().toISOString(),
    reply: null
  };

  reviews.push(newReview);
  writeReviews(reviews);

  // Re-calculate and update salon average rating and reviews count in salons.json
  const salons = readSalons();
  const salonIndex = salons.findIndex(s => s.id === targetSalonId);
  if (salonIndex !== -1) {
    const salonReviews = reviews.filter(r => r.salon_id === targetSalonId);
    const totalReviews = salonReviews.length;
    const avgRating = parseFloat((salonReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1));

    salons[salonIndex].rating = avgRating;
    salons[salonIndex].reviews = totalReviews;

    writeSalons(salons);
  }

  res.status(201).json({
    success: true,
    message: 'Thank you for sharing your experience! Review registered successfully.',
    data: newReview
  });
});

// DELETE review for a booking
app.delete('/api/reviews/booking/:booking_id', authMiddleware, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Only logged-in customers can delete reviews' });
  }
  
  const targetBookingId = parseInt(req.params.booking_id);
  const reviews = readReviews();
  const index = reviews.findIndex(r => r.booking_id === targetBookingId && r.user_id === req.user.id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }
  
  const targetSalonId = reviews[index].salon_id;
  reviews.splice(index, 1);
  writeReviews(reviews);
  
  // Re-calculate and update salon average rating and reviews count in salons.json
  const salons = readSalons();
  const salonIndex = salons.findIndex(s => s.id === targetSalonId);
  if (salonIndex !== -1) {
    const salonReviews = reviews.filter(r => r.salon_id === targetSalonId);
    const totalReviews = salonReviews.length;
    const avgRating = totalReviews > 0 
      ? parseFloat((salonReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)) 
      : 5.0;
      
    salons[salonIndex].rating = avgRating;
    salons[salonIndex].reviews = totalReviews;
    writeSalons(salons);
  }
  
  res.json({ success: true, message: 'Review deleted successfully' });
});

// POST Owner reply to a review
app.post('/api/admin/reviews/:id/reply', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied: Administrative privileges required' });
  }

  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ success: false, message: 'Reply content cannot be empty' });
  }

  const reviewId = parseInt(req.params.id);
  const reviews = readReviews();
  const reviewIndex = reviews.findIndex(r => r.id === reviewId);

  if (reviewIndex === -1) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  const salonId = reviews[reviewIndex].salon_id;
  if (salonId !== parseInt(req.user.salon_id)) {
    return res.status(403).json({ success: false, message: 'Access denied: You can only reply to reviews for your own salon' });
  }

  // Check staff permissions
  if (req.user.role === 'staff') {
    const salons = readSalons();
    const salonObj = salons.find(s => s.id === salonId);
    if (!salonObj || !salonObj.staff_can_reply) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: Staff review reply permissions are currently disabled by the owner' 
      });
    }
  }

  reviews[reviewIndex].reply = {
    text: text.trim(),
    date: new Date().toISOString(),
    replied_by: req.user.role
  };

  writeReviews(reviews);
  res.json({ success: true, message: 'Reply published successfully', data: reviews[reviewIndex] });
});

// PUT Toggle staff reply settings
app.put('/api/admin/salon/settings', authMiddleware, (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Access denied: Only salon owners can adjust permissions' });
  }

  const { staff_can_reply } = req.body;
  if (staff_can_reply === undefined) {
    return res.status(400).json({ success: false, message: 'Missing staff_can_reply configuration payload' });
  }

  const salons = readSalons();
  const index = salons.findIndex(s => s.id === parseInt(req.user.salon_id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Salon not found' });

  salons[index].staff_can_reply = !!staff_can_reply;
  writeSalons(salons);

  res.json({ 
    success: true, 
    message: `Staff reply permissions have been ${staff_can_reply ? 'enabled' : 'disabled'}`, 
    data: salons[index] 
  });
});
// GET user profile
app.get('/api/profile', authMiddleware, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const profiles = readProfiles();
  let profile = profiles.find(p => p.user_id === user.id);
  
  if (!profile) {
    profile = {
      user_id: user.id,
      bio: `DelhiGlow ${user.role === 'owner' ? 'Salon Partner' : user.role === 'staff' ? 'Staff Specialist' : 'Customer Connoisseur'}.`,
      gender: 'Not specified',
      avatar: '',
      updated_at: new Date().toISOString()
    };
    profiles.push(profile);
    writeProfiles(profiles);
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      salon_id: user.salon_id,
      bio: profile.bio || '',
      gender: profile.gender || 'Not specified',
      avatar: profile.avatar || '',
      notifications: user.notifications || { email: true, sms: false, whatsapp: true }
    }
  });
});

// GET customer bookings
app.get('/api/customer/bookings', authMiddleware, (req, res) => {
  const bookings = readBookings();
  const reviews = readReviews();
  const salons = readSalons();
  const userBookings = bookings.filter(b => b.email && b.email.toLowerCase() === req.user.email.toLowerCase());
  // Sort by created_at descending
  userBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Augment each booking with completion, review details, and salon phone
  const augmentedBookings = userBookings.map(b => {
    const details = getBookingCompletionDetails(b, reviews);
    const salon = salons.find(s => s.id === b.salon_id);
    return {
      ...b,
      isCompleted: details.isCompleted,
      isReviewable: details.isReviewable,
      reviewStatus: details.status, // 'cancelled', 'upcoming', 'reviewed', 'expired', 'reviewable'
      isReviewed: details.isReviewed,
      salon_phone: salon ? salon.contact : ''
    };
  });

  res.json({ success: true, data: augmentedBookings });
});

// PATCH cancel customer booking
app.patch('/api/customer/bookings/:id/cancel', authMiddleware, (req, res) => {
  const bookings = readBookings();
  const index = bookings.findIndex(b => b.id === parseInt(req.params.id) && b.email && b.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  
  if (bookings[index].status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
  }

  if (bookings[index].status === 'completed') {
    return res.status(400).json({ success: false, message: 'Completed bookings cannot be cancelled' });
  }
  
  bookings[index].status = 'cancelled';
  writeBookings(bookings);
  
  // Trigger cancellation notifications asynchronously
  sendBookingNotifications(bookings[index], 'cancel', {}, readUsers()).catch(err => {
    console.error('✕ Failed to send booking cancellation notifications:', err.message);
  });
  
  res.json({ success: true, message: 'Booking cancelled successfully', data: bookings[index] });
});

// PATCH dismiss review option for booking
app.patch('/api/customer/bookings/:id/dismiss-review', authMiddleware, (req, res) => {
  const bookings = readBookings();
  const index = bookings.findIndex(b => b.id === parseInt(req.params.id) && b.email && b.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  
  bookings[index].reviewDismissed = true;
  writeBookings(bookings);
  
  res.json({ success: true, message: 'Review option dismissed successfully', data: bookings[index] });
});

// GET customer beauty profile
app.get('/api/customer/beauty-profile', authMiddleware, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Access denied: Customer privileges required' });
  }

  // Check the dedicated beautyprofile collection first
  const beautyProfiles = readBeautyProfiles();
  const bp = beautyProfiles.find(p => String(p.user_id) === String(req.user.id));
  if (bp) {
    const { user_id, updated_at, ...profileData } = bp;
    return res.json({ success: true, data: profileData });
  }

  // Fallback to in-memory cached user document
  const users = readUsers();
  const user = users.find(u => String(u.id) === String(req.user.id));
  if (!user) return res.status(404).json({ success: false, message: 'Customer profile not found' });

  res.json({ success: true, data: user.beautyProfile || null });
});

// PUT update customer beauty profile
app.put('/api/customer/beauty-profile', authMiddleware, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Access denied: Customer privileges required' });
  }

  const { beautyProfile } = req.body;
  if (!beautyProfile) {
    return res.status(400).json({ success: false, message: 'Missing beautyProfile object' });
  }

  const users = readUsers();
  const index = users.findIndex(u => String(u.id) === String(req.user.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Customer profile not found' });
  }

  // 1. Merge into users collection
  users[index].beautyProfile = beautyProfile;
  writeUsers(users);

  // 2. Merge into profiles collection too
  const profiles = readProfiles();
  const pIndex = profiles.findIndex(p => String(p.user_id) === String(req.user.id));
  if (pIndex !== -1) {
    profiles[pIndex].beautyProfile = beautyProfile;
    profiles[pIndex].updated_at = new Date().toISOString();
    writeProfiles(profiles);
  } else {
    profiles.push({
      user_id: req.user.id,
      bio: 'DelhiGlow Customer Connoisseur.',
      gender: 'Not specified',
      avatar: '',
      beautyProfile: beautyProfile,
      updated_at: new Date().toISOString()
    });
    writeProfiles(profiles);
  }

  // 3. Save/Merge into dedicated beautyprofile collection too
  const beautyProfiles = readBeautyProfiles();
  const bpIndex = beautyProfiles.findIndex(bp => String(bp.user_id) === String(req.user.id));
  const newBpDoc = {
    user_id: req.user.id,
    ...beautyProfile,
    updated_at: new Date().toISOString()
  };
  if (bpIndex !== -1) {
    beautyProfiles[bpIndex] = newBpDoc;
  } else {
    beautyProfiles.push(newBpDoc);
  }
  writeBeautyProfiles(beautyProfiles);

  res.json({ success: true, message: 'Beauty profile updated successfully', data: users[index].beautyProfile });
});

// PUT update user profile
app.put('/api/profile', authMiddleware, async (req, res) => {
  const { name, email, phone, bio, gender, oldPassword, newPassword, avatar } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const user = users[userIndex];

  // Check email conflict
  const emailConflict = users.some(u => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase());
  if (emailConflict) {
    return res.status(400).json({ success: false, message: 'An account with this email address already exists' });
  }

  // Handle password change if requested
  if (oldPassword || newPassword) {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required to update password' });
    }
    const expectedHash = hashPassword(oldPassword, user.salt);
    if (user.passwordHash !== expectedHash) {
      return res.status(400).json({ success: false, message: 'Current password verification failed' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const newSalt = generateSalt();
    user.salt = newSalt;
    user.passwordHash = hashPassword(newPassword, newSalt);
  }

  // Update password and/or email in Firebase Auth if active and user is a Firebase user to keep credentials synchronized
  const isFirebaseUser = typeof user.id === 'string' && isNaN(Number(user.id));
  if (isFirebaseActive && auth && isFirebaseUser) {
    try {
      const updateData = {};
      if (user.email.toLowerCase() !== email.toLowerCase()) {
        updateData.email = email.toLowerCase();
      }
      if (newPassword) {
        updateData.password = newPassword;
      }
      if (Object.keys(updateData).length > 0) {
        await auth.updateUser(user.id, updateData);
        console.log(`⚡ Firebase Auth credentials updated for UID: ${user.id}`);
      }
    } catch (e) {
      console.warn(`✕ Could not update credentials in Firebase Auth:`, e.message);
      return res.status(400).json({ success: false, message: `Firebase Auth Update Failed: ${e.message}` });
    }
  }

  // Update user info
  user.name = name;
  user.email = email.toLowerCase();
  user.phone = phone;

  users[userIndex] = user;
  writeUsers(users);

  // Update profile info
  const profiles = readProfiles();
  let profileIndex = profiles.findIndex(p => p.user_id === user.id);
  let profile;

  if (profileIndex === -1) {
    profile = {
      user_id: user.id,
      bio: bio || '',
      gender: gender || 'Not specified',
      avatar: avatar || '',
      updated_at: new Date().toISOString()
    };
    profiles.push(profile);
  } else {
    profile = profiles[profileIndex];
    profile.bio = bio !== undefined ? bio : profile.bio;
    profile.gender = gender !== undefined ? gender : profile.gender;
    profile.avatar = avatar !== undefined ? avatar : profile.avatar;
    profile.updated_at = new Date().toISOString();
    profiles[profileIndex] = profile;
  }
  writeProfiles(profiles);

  // Re-generate authentication token with updated info
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Profile updated successfully!',
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
      salon_id: user.salon_id,
      avatar: profile.avatar || '',
      token
    }
  });
});

// PUT update user notification preferences
app.put('/api/profile/notifications', authMiddleware, (req, res) => {
  const { notifications } = req.body;
  if (!notifications || typeof notifications !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid or missing notifications object' });
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const updatedNotifications = {
    email: !!notifications.email,
    sms: !!notifications.sms,
    whatsapp: !!notifications.whatsapp
  };

  users[userIndex].notifications = updatedNotifications;
  writeUsers(users);

  res.json({
    success: true,
    message: 'Notification preferences updated successfully!',
    data: updatedNotifications
  });
});

// DELETE user profile
app.delete('/api/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const user = users[userIndex];
  const userRole = user.role;
  const userEmail = user.email;
  const userSalonId = user.salon_id;

  // Delete from Firebase Auth if active and user is a Firebase user
  const isFirebaseUser = typeof userId === 'string' && isNaN(Number(userId));
  if (isFirebaseActive && auth && isFirebaseUser) {
    try {
      await auth.deleteUser(userId);
      console.log(`⚡ Firebase Auth user deleted for UID: ${userId}`);
    } catch (e) {
      console.warn(`⚠️ Warning: Could not delete user from Firebase Auth:`, e.message);
    }
  }

  // 1. Remove the user from users.json
  users.splice(userIndex, 1);

  // 2. Remove user's profile from profiles.json
  const profiles = readProfiles();
  const updatedProfiles = profiles.filter(p => p.user_id !== userId);
  writeProfiles(updatedProfiles);

  // 3. Remove reviews written by this user
  let reviews = readReviews();
  reviews = reviews.filter(r => r.user_id !== userId);

  // 4. Remove bookings made by this user (by email match)
  let bookings = readBookings();
  bookings = bookings.filter(b => b.email.toLowerCase() !== userEmail.toLowerCase());

  // 4b. Remove beauty profile of this user from beautyprofile.json
  const beautyProfiles = readBeautyProfiles();
  const updatedBeautyProfiles = beautyProfiles.filter(bp => String(bp.user_id) !== String(userId));
  writeBeautyProfiles(updatedBeautyProfiles);

  // 5. Cascade delete if the user is a Salon Owner
  if (userRole === 'owner' && userSalonId) {
    // Delete their salon from salons.json
    const salons = readSalons();
    const updatedSalons = salons.filter(s => s.id !== userSalonId);
    writeSalons(updatedSalons);

    // Delete staff members belonging to this salon from Firebase Auth if active and are Firebase users
    const staffIds = users.filter(u => u.role === 'staff' && u.salon_id === userSalonId).map(u => u.id);
    if (isFirebaseActive && auth) {
      for (const staffId of staffIds) {
        const isFirebaseStaff = typeof staffId === 'string' && isNaN(Number(staffId));
        if (isFirebaseStaff) {
          try {
            await auth.deleteUser(staffId);
            console.log(`⚡ Firebase Auth user deleted for staff member UID: ${staffId}`);
          } catch (e) {
            console.warn(`⚠️ Warning: Could not delete staff user from Firebase Auth:`, e.message);
          }
        }
      }
    }

    // Delete staff members belonging to this salon from users.json
    const filteredUsers = users.filter(u => !(u.role === 'staff' && u.salon_id === userSalonId));
    writeUsers(filteredUsers);

    // Delete staff profiles from profiles.json
    const finalProfiles = updatedProfiles.filter(p => !staffIds.includes(p.user_id));
    writeProfiles(finalProfiles);

    // Delete all bookings for this salon from bookings.json
    bookings = bookings.filter(b => b.salon_id !== userSalonId);

    // Delete all reviews for this salon from reviews.json
    reviews = reviews.filter(r => r.salon_id !== userSalonId);
  } else {
    writeUsers(users);
  }

  // Write final bookings and reviews
  writeBookings(bookings);
  writeReviews(reviews);

  res.json({
    success: true,
    message: 'Your profile and all associated data have been deleted successfully.'
  });
});

// Helper to query Gemini API (v1beta) using native global fetch
const callGemini = async (prompt, imageBase64 = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const fetchFn = typeof fetch !== 'undefined' ? fetch : null;
  if (!fetchFn) {
    throw new Error('Global fetch is not available. Please upgrade Node to version 18+');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  let body;
  if (imageBase64) {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    body = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }]
    };
  } else {
    body = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
  }

  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (Status ${res.status}): ${errText}`);
  }

  const data = await res.json();
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    throw new Error('Failed to parse Gemini API response: ' + JSON.stringify(data));
  }
};

// POST AI Lehenga-to-Look Bridal Stylist
app.post('/api/ai/styling', async (req, res) => {
  const { image, jewelry, salonId } = req.body;

  if (!salonId) {
    return res.status(400).json({ success: false, message: 'salonId is required' });
  }

  const salons = readSalons();
  const salon = salons.find(s => s.id === parseInt(salonId));
  if (!salon) {
    return res.status(404).json({ success: false, message: 'Salon not found' });
  }

  const servicesList = salon.services.map(s => `${s.name} (₹${s.price})`).join(', ');

  const prompt = `You are the lead AI Bridal Stylist at Delhi Glow, a luxury wellness and beauty registry platform in Delhi.
You are helping a bride design her perfect look. 
She has uploaded a photo of her wedding lehenga/saree and selected:
- Jewelry Type: ${jewelry || 'Not specified'}
- Salon Name: ${salon.name}
- Available Services at this salon: ${servicesList}

Based on her dress and jewelry, analyze the structural features of her attire (primary and secondary colors, embroidery patterns, necklines, modern vs traditional aesthetic) and coordinate them with her jewelry type to generate a cohesive styling look. 

Please return a JSON response with the following format:
{
  "lookName": "A unique, creative look name (e.g. Royal Rajkumari Crimson, Pastel Rose Elegance, Sun-Kissed Ochre Glow)",
  "makeupBrief": "A highly detailed, personalized 3-4 sentence description of the recommended makeup, skin base finish, eyeshadow style, lip shade, and highlights, explaining why it matches her specific dress colors/style and jewelry type",
  "hairBrief": "A detailed 2-3 sentence recommendation for the hairstyle, explaining how it balances the neckline/silhouette of her attire and jewelry",
  "matchingServices": [
     "A list of 1 to 3 service names EXACTLY matching the names in the available services list above that the bride should book to get this look."
  ]
}
Return ONLY a valid JSON string. Do not include markdown code block formatting (like \`\`\`json).`;

  try {
    if (process.env.GEMINI_API_KEY) {
      console.log('🤖 Querying Google Gemini API for Bridal Styling...');
      const responseText = await callGemini(prompt, image);
      
      // Clean up markdown block styling if present
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      return res.json({ success: true, data: parsedData });
    } else {
      throw new Error('Key not configured');
    }
  } catch (err) {
    console.log('⚠️ GEMINI_API_KEY is not configured or failed. Using local simulated AI styling engine.');
    
    // Dynamically generate multi-seed hashes from the image base64 content
    let hashColor = 0;
    let hashFabric = 0;
    let hashAesthetic = 0;

    if (image) {
      // Use different characters and offsets to extract independent, stable seeds
      for (let i = 0; i < image.length; i += 17) {
        hashColor = (hashColor + image.charCodeAt(i)) % 1000;
      }
      for (let i = 3; i < image.length; i += 23) {
        hashFabric = (hashFabric + image.charCodeAt(i)) % 1000;
      }
      for (let i = 7; i < image.length; i += 29) {
        hashAesthetic = (hashAesthetic + image.charCodeAt(i)) % 1000;
      }
    } else {
      hashColor = Math.floor(Math.random() * 1000);
      hashFabric = Math.floor(Math.random() * 1000);
      hashAesthetic = Math.floor(Math.random() * 1000);
    }

    const jewelryTypeClean = (jewelry || 'Polki & Kundan Gold').trim();

    // 1. Color Palettes (8 types)
    const colors = [
      {
        name: "Crimson Red & Gold",
        desc: "traditional deep crimson red fabric adorned with warm yellow-gold embellishments",
        short: "crimson red",
        lip: "a classic deep ruby red or rich velvet crimson lipstick"
      },
      {
        name: "Mint Green & Emerald",
        desc: "royal sage green hue accented by deep forest emerald accents",
        short: "mint green",
        lip: "a sophisticated rose-nude or warm terracotta lip shade"
      },
      {
        name: "Blushing Rose & Pink",
        desc: "delicate blushing rose pink fabric with soft pastel highlights",
        short: "rose pink",
        lip: "a fresh peach-pink gloss or soft mauve lip tone"
      },
      {
        name: "Mustard Yellow & Ochre",
        desc: "vibrant sun-kissed mustard yellow and ochre tones",
        short: "mustard yellow",
        lip: "a warm caramel nude or soft apricot lip stain"
      },
      {
        name: "Metallic Silver & Ivory",
        desc: "modern ivory white interwoven with shimmering metallic silver threading",
        short: "ivory white",
        lip: "a sophisticated cool-toned berry nude or satin dusty rose lipstick"
      },
      {
        name: "Peach Coral & Turquoise",
        desc: "exotic sunset peach coral base with turquoise bead highlights",
        short: "peach coral",
        lip: "a glossy coral nude or fresh peach lacquer lip"
      },
      {
        name: "Royal Indigo & Gold",
        desc: "majestic deep midnight indigo blue fabric woven with gold zari",
        short: "indigo blue",
        lip: "a soft plum or rich toasted-almond nude lipstick"
      },
      {
        name: "Lilac Lavender & Platinum",
        desc: "contemporary lilac lavender fabric styled with platinum beadwork",
        short: "lilac lavender",
        lip: "a modern mauve-pink or high-shine clear lip gloss over mauve liner"
      }
    ];

    // 2. Fabric and Embroidery Patterns (8 types)
    const fabrics = [
      {
        name: "Zardozi Hand-Embroidery",
        desc: "heavy, intricate gold zardozi metallic wire embroidery with detailed floral borders"
      },
      {
        name: "Gota Patti Ribbon Work",
        desc: "traditional Rajasthani hand-stitched gota patti ribbon work and small mirror highlights"
      },
      {
        name: "Chikankari Threadwork",
        desc: "delicate tone-on-tone Lucknowi Chikankari floral thread embroidery on sheer organza layers"
      },
      {
        name: "Swarovski Crystal Beading",
        desc: "shimmering clusters of Swarovski crystals and detailed glass cutdana beadwork"
      },
      {
        name: "Banarasi Silk Brocade",
        desc: "rich, luxurious handwoven Banarasi silk brocade featuring golden zari bootis"
      },
      {
        name: "Plush Micro-Velvet Dabka",
        desc: "plush, deep royal micro-velvet fabric adorned with antique dabka and salma hand-embroidery"
      },
      {
        name: "Abstract Cutdana Threadwork",
        desc: "modern abstract cutdana embellishments and sleek metallic geometric thread designs"
      },
      {
        name: "Bandhani Silk Print",
        desc: "classic hand-tied Bandhani tie-dye silk print with elegant gold piping borders"
      }
    ];

    // 3. Style Aesthetics (6 types)
    const aesthetics = [
      {
        name: "Royal Heritage",
        desc: "timeless, traditional majesty",
        base: "a flawless high-definition velvet matte base that provides complete sweat-proof coverage",
        blush: "deep terracotta blush paired with soft gold stardust highlighter on the cheekbones",
        hair: "a classic sleek low-bun wrapped with a fresh double-strand jasmine gajra to support a heavy sheer dupatta"
      },
      {
        name: "Ethereal Romantic",
        desc: "soft, dreamy, and natural allure",
        base: "an ultra-lightweight dewy glass-skin base that catches the light naturally",
        blush: "a fresh peach-pink cheek flush and a wet-look liquid champagne highlight",
        hair: "romantic soft-waves left cascading half-up, half-down, adorned with delicate white baby's breath flowers"
      },
      {
        name: "Modern Minimalist",
        desc: "sleek, contemporary sophistication",
        base: "a pristine, demi-matte base finish that replicates natural skin texture under studio flash",
        blush: "a subtle taupe contour and a soft pearl-shimmer strobe glow",
        hair: "a sophisticated textured French twist or a sleek high ponytail with delicate pearl hairpins"
      },
      {
        name: "Bollywood Glam",
        desc: "dramatic, high-contrast, red-carpet ready",
        base: "a full-coverage satin base with airbrushed blurring filters",
        blush: "a warm apricot blush with a golden bronze strobe highlight on the cheekbones",
        hair: "voluminous, bouncy Hollywood waves parted on the side with a crystal-encrusted hairpin"
      },
      {
        name: "Bohemian Fusion",
        desc: "earthy, textured, and artistic expression",
        base: "a sun-kissed bronzed base with a satin-soft finish",
        blush: "a warm bronze contour and a liquid gold highlight across high points",
        hair: "a voluminous, textured bohemian side-braid decorated with delicate marigold petals and small gold beads"
      },
      {
        name: "Vintage Classic",
        desc: "nostalgic, timeless mid-century elegance",
        base: "a clean porcelain-matte base with a flawless, powder-smooth finish",
        blush: "a soft mauve-pink blush dusted lightly across the apples of the cheeks",
        hair: "a neat retro side-swept chignon bun styled with a vintage gold hair comb"
      }
    ];

    // Select items based on hashes
    const colorObj = colors[hashColor % colors.length];
    const fabricObj = fabrics[hashFabric % fabrics.length];
    const aestheticObj = aesthetics[hashAesthetic % aesthetics.length];

    // 4. Jewelry Matching Details
    let eyeMakeup = "";
    let jewelryDetails = "";
    let lookNameSuffix = "";

    if (jewelryTypeClean.includes('Diamond')) {
      eyeMakeup = "a cool-toned silver-champagne shimmer cut-crease with a sharp liquid cat-eye wing";
      jewelryDetails = "complements the cool sparkle of diamonds and platinum mountings";
      lookNameSuffix = "Platinum Glam";
    } else if (jewelryTypeClean.includes('Pearl') || jewelryTypeClean.includes('Emerald')) {
      eyeMakeup = "a striking forest-green smoked-out outer V wing with a central champagne-shimmer halo";
      jewelryDetails = "draws out the deep hues of natural emerald beads and lustrous cream pearls";
      lookNameSuffix = "Emerald Luxury";
    } else if (jewelryTypeClean.includes('Temple')) {
      eyeMakeup = "a warm metallic copper and bronze smokey eye with a thick smudge of organic kohl";
      jewelryDetails = "pairs beautifully with the heavy, rich antique gold finish of temple motifs";
      lookNameSuffix = "Temple Heritage";
    } else if (jewelryTypeClean.includes('Minimalist') || jewelryTypeClean.includes('Silver')) {
      eyeMakeup = "a clean, monochromatic soft taupe wash across the lids with a thin, tight-lined tightline";
      jewelryDetails = "matches the clean, understated lines of modern silver and minimal ornaments";
      lookNameSuffix = "Modern Boho";
    } else { // Polki & Kundan Gold
      eyeMakeup = "a royal gold-foil cut-crease eyeshadow look with heavy charcoal kohl-rimmed waterlines";
      jewelryDetails = "harmonizes perfectly with the uncut polki gems and yellow-gold meenakari backings";
      lookNameSuffix = "Kundan Splendour";
    }

    // 5. Construct Look Name & Briefs
    const lookName = `${colorObj.name} ${lookNameSuffix} (${aestheticObj.name})`;
    const makeupBrief = `Tailored for a dress showcasing ${colorObj.desc} with ${fabricObj.desc}. We recommend ${aestheticObj.base} to match the ${aestheticObj.desc} aesthetic. The eye makeup features ${eyeMakeup}, beautifully complemented by ${colorObj.lip} which ${jewelryDetails}. Finished with ${aestheticObj.blush}.`;
    const hairBrief = `To balance the silhouette of your ${colorObj.short} attire with its ${fabricObj.name} detailing, we suggest styling your hair into ${aestheticObj.hair}.`;

    // 6. Dynamic Service Matching
    let matchingServices = [];
    if (salon.services && salon.services.length > 0) {
      const matched = salon.services.filter(s => {
        const name = s.name.toLowerCase();
        // Match services depending on the selected aesthetic style
        if ((aestheticObj.name === 'Royal Heritage' || aestheticObj.name === 'Vintage Classic') && 
            (name.includes('bridal') || name.includes('traditional') || name.includes('hd') || name.includes('airbrush') || name.includes('royal') || name.includes('luxe'))) return true;
        if ((aestheticObj.name === 'Ethereal Romantic') && 
            (name.includes('dewy') || name.includes('glass') || name.includes('glow') || name.includes('facial') || name.includes('organic') || name.includes('hydra'))) return true;
        if ((aestheticObj.name === 'Modern Minimalist' || aestheticObj.name === 'Bollywood Glam') && 
            (name.includes('makeup') || name.includes('styling') || name.includes('contour') || name.includes('glam') || name.includes('luxe'))) return true;
        if ((aestheticObj.name === 'Bohemian Fusion') && 
            (name.includes('mehendi') || name.includes('braid') || name.includes('hair') || name.includes('styling') || name.includes('glow'))) return true;
        return false;
      }).slice(0, 2).map(s => s.name);

      matchingServices = matched.length > 0 ? matched : [salon.services[0].name];
    } else {
      matchingServices = ["Full Bridal Makeup"];
    }

    const dynamicLook = {
      lookName,
      makeupBrief,
      hairBrief,
      matchingServices
    };

    setTimeout(() => {
      res.json({ success: true, data: dynamicLook });
    }, 1200);
  }
});

// POST AI Chatbot Concierge
app.post('/api/ai/chat', async (req, res) => {
  const { messages, userLocation } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages history is required' });
  }

  const lastUserMsg = messages[messages.length - 1].content;
  const salons = readSalons();
  const salonsContext = salons.map(s => `- ${s.name} (Location: ${s.location}, Area: ${s.area}, Speciality: ${s.speciality}, Price Range: ${s.price_range})`).join('\n');

  const historyFormatted = messages.map(m => `${m.role === 'user' ? 'User' : 'Concierge'}: ${m.content}`).join('\n');

  const prompt = `You are "Glow Concierge", the AI Bridal Wellness Coordinator for Delhi Glow.
You are helpful, warm, professional, and knowledgeable about Indian bridal beauty prep.
Here is the context about our wellness platform:
- We have the following luxury beauty sanctuaries (salons) in Delhi:
${salonsContext}
- We offer bridal bookings, trials, skincare preps, and operating info.
- Operating hours for salons are generally 10:00 AM - 8:00 PM.
- Pre-bridal timelines: Hydrafacials/Polishing (3 months prior), Hair/Makeup trials (1 month prior), Mani/Pedi/Waxing (1 week prior).

Answer the bride's query politely. If she asks for recommendations, mention specific salons by name, their location, and ratings.
Keep your answer relatively concise (under 120 words) and format it cleanly with lists/bullet points if necessary.
Current conversation history:
${historyFormatted}`;

  try {
    if (process.env.GEMINI_API_KEY) {
      console.log('🤖 Querying Google Gemini API for Chatbot Concierge...');
      const responseText = await callGemini(prompt);
      return res.json({ success: true, reply: responseText });
    } else {
      throw new Error('Key not configured');
    }
  } catch (err) {
    console.log('⚠️ GEMINI_API_KEY is not configured or failed. Using local simulated AI chat responder.');
    
    // Polished local mock chatbot logic
    const query = lastUserMsg.toLowerCase();
    let reply = '';

    if (query.includes('location') || query.includes('where') || query.includes('recommend') || query.includes('salon') || query.includes('sanctuary') || query.includes('delhi')) {
      const matches = salons.map(s => `• **${s.name}** at ${s.location} (Rating: ${s.price_range || '★ 5.0'})`).slice(0, 3).join('\n');
      reply = `I would highly recommend these premier beauty sanctuaries in Delhi:\n\n${matches}\n\nYou can click **Find Sanctuaries** in the header to view their ritual catalogues and book slots!`;
    } else if (query.includes('skin') || query.includes('glow') || query.includes('prep') || query.includes('timeline') || query.includes('facial') || query.includes('calendar')) {
      reply = `Here is our recommended **Delhi Glow bridal timeline**:\n\n🌸 **3 Months Out**: Focus on deep-cleansing skin hydration (like Hydrafacials or polishing).\n🌸 **1 Month Out**: Book your makeup and hair trials.\n🌸 **1 Week Out**: Get manicures, pedicures, and body prep.\n\nYou can set up this exact plan in the **Bridal Journey** tab inside your profile!`;
    } else {
      reply = `Hello! I am your **Glow Concierge** bridal coordinator. 🌸\n\nI can suggest top-rated beauty spots in Delhi, recommend skincare timelines, or assist you with booking a service. How is your wedding prep going?`;
    }

    setTimeout(() => {
      res.json({ success: true, reply });
    }, 800);
  }
});

// POST /api/contacts
app.post('/api/contacts', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing required contact fields' });
  }
  const contacts = readContacts();
  const newContact = {
    id: Date.now(),
    name,
    email,
    subject: subject || 'General Query',
    message,
    created_at: new Date().toISOString()
  };
  contacts.push(newContact);
  writeContacts(contacts);
  res.status(201).json({ success: true, message: 'Contact message saved successfully', data: newContact });
});

// POST /api/partners
app.post('/api/partners', (req, res) => {
  const { name, salonName, area, contact, email } = req.body;
  if (!name || !salonName || !area || !contact || !email) {
    return res.status(400).json({ success: false, message: 'Missing required partner fields' });
  }
  const partners = readPartners();
  const newPartner = {
    id: Date.now(),
    name,
    salonName,
    area,
    contact,
    email,
    created_at: new Date().toISOString()
  };
  partners.push(newPartner);
  writePartners(partners);
  res.status(201).json({ success: true, message: 'Partner application saved successfully', data: newPartner });
});

// POST /api/newsletters
app.post('/api/newsletters', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  const newsletter = readNewsletter();
  if (newsletter.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    return res.json({ success: true, message: 'Already subscribed!' });
  }
  const newSubscriber = {
    id: Date.now(),
    email: email.toLowerCase(),
    created_at: new Date().toISOString()
  };
  newsletter.push(newSubscriber);
  writeNewsletter(newsletter);
  res.status(201).json({ success: true, message: 'Subscribed successfully', data: newSubscriber });
});

// Serve static files from the React frontend build
const ROOT_BUILD_PATH = path.join(__dirname, '../build');
const FRONTEND_BUILD_PATH = path.join(__dirname, '../frontend/build');
const ROOT_PUBLIC_PATH = path.join(__dirname, '../public');

let staticPath = '';
if (fs.existsSync(ROOT_BUILD_PATH)) {
  staticPath = ROOT_BUILD_PATH;
} else if (fs.existsSync(FRONTEND_BUILD_PATH)) {
  staticPath = FRONTEND_BUILD_PATH;
} else if (fs.existsSync(ROOT_PUBLIC_PATH)) {
  staticPath = ROOT_PUBLIC_PATH;
}

if (staticPath) {
  console.log(`📂 Serving static frontend assets from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Initialize Firebase Sync and start server
initializeFirebaseSync().then(() => {
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`✅ DelhiGlow API running at http://localhost:${PORT}`);
    });
  }
}).catch(err => {
  console.error('✕ Failed to initialize Firebase Sync:', err.message);
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`✅ DelhiGlow API running at http://localhost:${PORT}`);
    });
  }
});

module.exports = app;

