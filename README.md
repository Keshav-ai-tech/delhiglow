# ❀ DelhiGlow ❀
### Delhi's Luxury Bridal Salon & Wellness Sanctuary

---

### 🌐 Live Platform
- **Live Project URL**: [https://delhiglow-backend.onrender.com](https://delhiglow-backend.onrender.com)

---

DelhiGlow is a premium, full-stack marketplace and reservation platform tailored for luxury bridal salons and wellness sanctuaries in Delhi. The application is designed with a high-end, responsive design system and provides a seamless booking experience, client personalization through AI-powered beauty quizzes, and vendor management dashboards.

---

## ✦ Key Features

- **Luxury Salon Curation**: Beautifully cataloged premier salons with dynamic pricing, services, timing rules, and ratings.
- **Unified Auth System**: Integrated Firebase Auth on the client, verified on the backend via Firebase Admin SDK, with a graceful local fallback mode.
- **Role-Based Access Control**: Separate user portals for **Customers** (view bookings, take personalization quizzes, write reviews) and **Owners** (manage salon listings, onboard staff, update operating hours, and verify reservations).
- **AI-Powered Beauty Curation**: Interactive AI styling concierge using the Google Gemini API to analyze client preferences and match them with personalized beauty treatments.
- **Robust Reservation Pipeline**: Dynamic slot booking that validates operating hours and closed days, sending immediate confirmation emails and simulated WhatsApp/SMS alerts.
- **Optimized Firestore Sync**: A highly efficient, diff-based background sync system that updates Firestore documents concurrently without blocking the main event loop.
- **Enterprise-Grade SMTP Integration**: Secure transactional email delivery with custom, beautifully styled HTML responsive templates.

---

## 📂 Project Architecture

```
delhiglow/
├── frontend/                 # Client React Application
│   ├── src/
│   │   ├── pages/            # Page components (Auth, Home, Admin, Salon, Quiz)
│   │   ├── firebase.js       # Client Firebase SDK Initialization
│   │   ├── index.js          # App entrypoint
│   │   └── App.js            # Router and layout configuration
│   ├── public/               # Public assets
│   └── package.json
│
├── backend/                  # Server Node/Express API
│   ├── uploads/              # Local uploaded media directory
│   ├── sent_emails/          # Offline/local debug copy of sent HTML emails
│   ├── server.js             # Main API entrypoint and controllers
│   ├── firebase-admin.js     # Firebase Admin SDK Configuration
│   ├── email-service.js      # Transporter setup and HTML templates
│   ├── salons.json           # Local JSON fallback databases
│   ├── bookings.json
│   ├── users.json
│   └── package.json
│
└── README.md                 # Project documentation
```

---

## 🛠️ Technology Stack

- **Frontend**: React (v18), React Router Dom (v6), Vanilla CSS (Jaali pattern backgrounds, custom dark/light color schemes, gold accents).
- **Backend**: Node.js, Express.js.
- **Database**: Firestore (Primary) / Local File System JSON Database (Graceful Fallback).
- **Authentication**: Firebase Authentication.
- **Communications**: Nodemailer (SMTP), simulated SMS/WhatsApp logging.
- **AI Concierge**: Google Gemini API (`@google/generative-ai`).

---

## ⚙️ Environment Variables Setup

Both the frontend and backend require environmental configurations to be set up. Create a `.env` file in each respective directory.

### 1. Frontend Environment (`frontend/.env`)

```ini
# Firebase Web Client Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 2. Backend Environment (`backend/.env`)

```ini
PORT=5001

# Google Gemini API Key for AI Concierge
GEMINI_API_KEY=your_google_gemini_api_key

# SMTP Mail Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_google_app_password

# Firebase Admin SDK (Production & Staging)
# Set these on your hosting provider (e.g. Render) to enable Firestore and Auth validation
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
```

---

## ⚡ Running Locally

To run the application locally on your computer, follow these simple steps:

### Backend Development Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the server dependencies:
   ```bash
   npm install
   ```
3. Start the dev server with live-reloads:
   ```bash
   npm run dev
   ```
   *The backend will boot up at `http://localhost:5001`. If Firebase Admin credentials are not detected, the backend will automatically run in **Graceful Fallback Mode** using local JSON databases.*

### Frontend React App
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the client dependencies:
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
   *The app will automatically open at `http://localhost:3000`.*

---

## 🚀 Production Deployment to Render

When deploying the full-stack app to Render, configure two services:

### 1. Backend Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Add all variables defined in `backend/.env`. Note that for `FIREBASE_PRIVATE_KEY`, copy the raw key from your service account JSON file, ensuring the newlines (`\n`) are preserved. The backend configuration contains custom parser logic to automatically sanitize quotes and newline characters.

### 2. Static Site Frontend
- **Build Command**: `npm run build`
- **Publish Directory**: `build`
- **Redirects/Rewrites**: Set a rewrite rule for single page apps:
  - Source: `/*`
  - Destination: `/index.html`
  - Action: `Rewrite`
- **Environment Variables**: Add the variables from `frontend/.env`.

---

## 🛡️ Database Synchronization Details

DelhiGlow utilizes an automated synchronization engine between the local file system cache and Firebase Firestore:
- **Startup Parallelization**: On server start, it queries all collections in parallel (`Promise.all`), reducing launch latency from ~9s to less than 1s.
- **Diff-Based Updates**: Instead of overwriting complete collections, the backend maintains a local hash map of the last-synced state. Only modifications, new entries, and deleted documents are pushed to Firestore in batches, saving database read/write costs.
- **Offline Resilience**: If the Firestore connection drops or is unconfigured, the app operates uninterrupted using the local database files (`salons.json`, `bookings.json`, etc.).
