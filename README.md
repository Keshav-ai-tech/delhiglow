# 💄 DelhiGlow – Delhi's Luxury Bridal Sanctuary & Wellness Marketplace

> **A Premium Mughal-Modern SPA & Beauty Marketplace**  
> Built for **SuperXgen AI Startup Buildathon 2026**  
> **Live Link:** [delhiglow.vercel.app](https://delhiglow.vercel.app) *(or replace with your custom Vercel/Render URL)*

DelhiGlow is a state-of-the-art beauty and wellness marketplace connecting high-intent customers in Delhi NCR with premium luxury salons, bridal studios, and wellness sanctuaries. The platform merges rich Indian beauty heritage (Mughal-inspired aesthetics) with modern tech architecture, complete with an AI-powered bridal stylist concierge, real-time match rankings, and multi-channel notification dispatchers.

---

## 🌟 Key Features

### 1. 🌺 "Find Your Delhi Glow" Beauty Profile Quiz
* **Mughal-Modern Archetype Matcher**: An interactive 8-step spa concierge quiz that maps customer preferences (vibes, style profiles, budgets, skin/hair types, search radius) to custom beauty archetypes (*The Royal Bridal Muse*, *The Urban Quick-Chic*, *The Serene Spa Soul*, or *The Insta Muse*).
* **Native Share Card Exporter**: A custom HTML5 Canvas card generator that exports the customer's beauty persona summary, traits, and mantra as a downloadable high-resolution PNG for Instagram or WhatsApp sharing.
* **Personalized Search & Sorting**: Dynamically calculates a match score (clamped between 60% and 99%) for all salon listings based on travel radius, service selection, and budget, displaying a gold-sparkled `✨ X% Match` badge and offering a custom "Beauty Match" sort.

### 2. 👰 AI Lehenga-to-Look Bridal Stylist
* **Attire-Coordinated Styling**: An advanced styling engine powered by the Gemini API that processes base64 uploaded outfit images (Lehengas, Sarees) and coordinates look recommendations (makeup, hair, jewelry) matching 1,920 unique style permutations.
* **Dynamic Service Matching**: Falls back to actual local catalog services (e.g. matching an Ethereal Romantic style to hydration facials and a Royal Heritage style to HD/Airbrush makeup).

### 3. 🔒 Hybrid Data Layer & Seeding
* **Firebase Firestore Integration**: Syncs database models (`salons`, `bookings`, `users`, `reviews`, `profiles`, `contacts`, `partners`) with Google Cloud Firestore.
* **Bi-directional Startup Sync**: Syncs local JSON database fallbacks with Firestore collections on startup, resolving database states locally for maximum offline/graceful performance.
* **Graceful Fallback Mode**: Automatically falls back to local file system reads/writes warning-free if Firebase environment variables are missing.

### 4. 🔑 Strict Auth, Roles & Profile Cascade Deletion
* **Firebase Client SDK Auth**: Validates ID tokens at `/api/auth/register` and `/api/auth/login` using backend token-verification middlewares.
* **Dynamic Role Guarding**: Locks administrative views to `owner`/`staff` roles and the quiz/bookings history views to the `customer` role.
* **Cascade Deletion Sync**: Account deletion cascades to delete all linked staff members from Firebase Auth and cleans up associated beauty profile records in background sync.

### 5. 📬 Notification Dispatcher & Channel Preferences
* **Mughal-Modern Email Templates**: High-end responsive HTML email layouts for booking confirmations, cancellations, and status modifications signed by the DelhiGlow founder.
* **Multi-channel Dispatching**: Runs parallel dispatchers checking preferences (Email, SMS, WhatsApp) to send actual SMTP emails or console-based simulated message alerts.

### 6. ⭐ Post-Booking Review System
* **5-Day Expiry Window**: Customers can leave reviews with photo attachments only for completed bookings within a strict 5-day deadline.
* **Dynamic Rating Recalculation**: Submitting/deleting reviews dynamically updates average rating scores and review counts in the salon listing details.

---

## 🛠️ Project Tech Stack

* **Frontend**: React (v18), React Router (v6), Vanilla CSS (Custom Glassmorphism, Mughal-modern typography via Playfair Display & Outfit fonts).
* **Backend**: Node.js, Express, Firebase Admin SDK, Nodemon.
* **Database**: Firebase Firestore + Local JSON backups.
* **Services**: Nodemailer (SMTP), HTML5 Canvas API (Dynamic Exporters), Leaflet API (Map Picker Coordinates).

---

## 📂 Project Structure

```
delhiglow/
├── backend/
│   ├── email-service.js       ← Nodemailer templates & simulated notification channels
│   ├── firebase-admin.js      ← Firestore connection setup & credentials validation
│   ├── server.js              ← Core REST API Express server
│   ├── salons.json            ← Pre-seeded salon listing catalog
│   ├── bookings.json          ← Bookings backups (auto-synchronized to Firestore)
│   ├── reviews.json           ← Review backing store (auto-synchronized to Firestore)
│   ├── beautyprofile.json     ← Beauty profile quiz data (auto-synchronized to Firestore)
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── favicon.png        ← Transparent terracotta hand mirror & lotus wellness icon
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── Navbar.js      ← Brand navbar with audio drone chimes controls
│       │   ├── Footer.js
│       │   ├── SalonCard.js   ← Adornment list cards with Director highlight & Match scores
│       │   └── AIAssistant.js ← Floating AI Concierge drawer
│       ├── pages/
│       │   ├── Home.js
│       │   ├── Salons.js      ← Catalog directory with debounced URL parameters sync
│       │   ├── SalonDetail.js ← Service multi-selection form, date validator & reviews
│       │   ├── Profile.js     ← User profile, security dashboard, & notifications toggles
│       │   ├── Bookings.js    ← Customer dedicated bookings history list
│       │   ├── BeautyQuiz.js  ← Beauty profile quiz flow & canvas exporter
│       │   └── Auth.js        ← Session authorization and registration controller
│       ├── App.js
│       ├── App.css            ← Modular design system variables & responsive overrides
│       └── index.js
```

---

## 🚀 Setup & Installation

### Prerequisites
* Node.js (v18 or higher)
* NPM

### 1. Configuration (Environment Variables)

Create a `.env` file in `frontend/.env` to link Firebase client credentials:
```env
REACT_APP_FIREBASE_API_KEY=your_client_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_client_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_client_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_client_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_client_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_client_app_id
```

Create a `.env` file in `backend/.env` to configure SMTP mails and credentials:
```env
PORT=5001
# Firebase Admin Credentials
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key_here"

# SMTP Mail Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```
*(Alternatively, place the `firebase-service-account.json` file inside the `backend/` directory directly).*

### 2. Launch the Backend API Server
```bash
cd backend
npm install
npm run dev        # Starts server on http://localhost:5001
```

### 3. Launch the Frontend React App
```bash
cd ../frontend
npm install
npm start          # Launches browser client on http://localhost:3000
```

---

## 🧪 Integration Testing & Verification

The project includes custom backend integration test suites to verify system functionality:
* **Profile Management**: `node scratch/test_profile_api.js`
* **Bookings & Cancellation**: `node scratch/test_customer_bookings_api.js`
* **Closed Day Booking Validations**: `node scratch/test_closed_days_validation.js`
* **Mughal Welcome Emails**: `node scratch/test_welcome_email.js`
* **Forgot Password Recovery**: `node scratch/test_forgot_password.js`
* **Channel Notifications**: `node scratch/test_notifications.js`

---

## 🌐 Deployment Guidelines

### Deploy Frontend (Vercel)
1. Add the environment variables (`REACT_APP_FIREBASE_...`) in the Vercel Dashboard.
2. Build output configuration should point to `frontend/`.
```bash
cd frontend
npm run build
```

### Deploy Backend (Render / Railway)
1. Connect your repository and map the root directory to `backend/`.
2. Define the starting command: `npm start` (or `node server.js`).
3. Set the environment variables including `PORT` and Firebase variables.

---

## 👑 License & Curation

Built with ❤️ by **Keshav Sharma** for the SuperXgen AI Startup Buildathon 2026. Custom assets are property of DelhiGlow Concierge.
