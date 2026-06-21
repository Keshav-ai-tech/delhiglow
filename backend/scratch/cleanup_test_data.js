const fs = require('fs');
const path = require('path');

// Absolute paths
const BACKEND_DIR = '/Users/keshav/Documents/delhiglow/backend';
const SALONS_PATH = path.join(BACKEND_DIR, 'salons.json');
const USERS_PATH = path.join(BACKEND_DIR, 'users.json');
const PROFILES_PATH = path.join(BACKEND_DIR, 'profiles.json');
const BOOKINGS_PATH = path.join(BACKEND_DIR, 'bookings.json');
const REVIEWS_PATH = path.join(BACKEND_DIR, 'reviews.json');
const NEWSLETTER_PATH = path.join(BACKEND_DIR, 'newsletter.json');
const CONTACTS_PATH = path.join(BACKEND_DIR, 'contacts.json');
const PARTNERS_PATH = path.join(BACKEND_DIR, 'partners.json');
const BEAUTY_PROFILE_PATH = path.join(BACKEND_DIR, 'beautyprofile.json');

const { db, auth, isFirebaseActive } = require(path.join(BACKEND_DIR, 'firebase-admin'));

// Helper to check if an email matches test criteria
function isTestEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.includes('@test.com') ||
    lower.startsWith('cust_') ||
    lower.startsWith('owner_') ||
    lower.startsWith('forgot_') ||
    lower.startsWith('test_') ||
    lower.startsWith('news_subscriber_') ||
    lower === 'test@gmail.com'
  );
}

// Helper to check if a salon name matches test criteria
function isTestSalon(name) {
  if (!name) return false;
  return name.includes('DelhiGlow Elite Studio Test') || name.includes('Test');
}

async function run() {
  console.log('🧹 Starting cleanup of test accounts and test data...');

  const deletedUserIds = new Set();
  const deletedSalonIds = new Set();

  // 1. Firebase Authentication Deletion
  if (isFirebaseActive && auth) {
    try {
      console.log('Listing Firebase Auth users to find test accounts...');
      let nextPageToken;
      let count = 0;
      do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        for (const userRecord of listUsersResult.users) {
          const email = userRecord.email || '';
          if (isTestEmail(email)) {
            console.log(`Deleting Auth user: ${email} (${userRecord.uid})`);
            await auth.deleteUser(userRecord.uid);
            count++;
          }
        }
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
      console.log(`✓ Deleted ${count} test users from Firebase Auth.`);
    } catch (err) {
      console.error('✕ Error listing/deleting Firebase Auth users:', err.message);
    }
  }

  // 2. Firestore Deletion
  if (isFirebaseActive && db) {
    try {
      console.log('Cleaning up Firestore collections...');

      // A. Users collection
      const usersSnapshot = await db.collection('users').get();
      const usersBatch = db.batch();
      let userCount = 0;
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (isTestEmail(data.email) || isTestEmail(doc.id)) {
          console.log(`Scheduling users deletion for ID: ${doc.id} (${data.email})`);
          usersBatch.delete(doc.ref);
          deletedUserIds.add(Number(doc.id));
          deletedUserIds.add(doc.id);
          userCount++;
        }
      });
      if (userCount > 0) {
        await usersBatch.commit();
      }
      console.log(`✓ Deleted ${userCount} users from Firestore.`);

      // B. Salons collection
      const salonsSnapshot = await db.collection('salons').get();
      const salonsBatch = db.batch();
      let salonCount = 0;
      salonsSnapshot.forEach(doc => {
        const data = doc.data();
        if (isTestSalon(data.name) || deletedUserIds.has(Number(data.owner_id)) || deletedUserIds.has(data.owner_id)) {
          console.log(`Scheduling salons deletion for ID: ${doc.id} (${data.name})`);
          salonsBatch.delete(doc.ref);
          deletedSalonIds.add(Number(doc.id));
          deletedSalonIds.add(doc.id);
          salonCount++;
        }
      });
      if (salonCount > 0) {
        await salonsBatch.commit();
      }
      console.log(`✓ Deleted ${salonCount} salons from Firestore.`);

      // C. Profiles collection
      const profilesSnapshot = await db.collection('profiles').get();
      const profilesBatch = db.batch();
      let profileCount = 0;
      profilesSnapshot.forEach(doc => {
        const data = doc.data();
        if (deletedUserIds.has(Number(data.user_id)) || deletedUserIds.has(data.user_id) || deletedUserIds.has(Number(doc.id)) || deletedUserIds.has(doc.id)) {
          console.log(`Scheduling profiles deletion for ID: ${doc.id}`);
          profilesBatch.delete(doc.ref);
          profileCount++;
        }
      });
      if (profileCount > 0) {
        await profilesBatch.commit();
      }
      console.log(`✓ Deleted ${profileCount} profiles from Firestore.`);

      // D. Beautyprofile collection
      const beautyprofileSnapshot = await db.collection('beautyprofile').get();
      const beautyprofileBatch = db.batch();
      let beautyprofileCount = 0;
      beautyprofileSnapshot.forEach(doc => {
        const data = doc.data();
        if (deletedUserIds.has(Number(data.user_id)) || deletedUserIds.has(data.user_id) || deletedUserIds.has(Number(doc.id)) || deletedUserIds.has(doc.id)) {
          console.log(`Scheduling beautyprofile deletion for ID: ${doc.id}`);
          beautyprofileBatch.delete(doc.ref);
          beautyprofileCount++;
        }
      });
      if (beautyprofileCount > 0) {
        await beautyprofileBatch.commit();
      }
      console.log(`✓ Deleted ${beautyprofileCount} beauty profiles from Firestore.`);

      // E. Bookings collection
      const bookingsSnapshot = await db.collection('bookings').get();
      const bookingsBatch = db.batch();
      let bookingCount = 0;
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        if (
          isTestEmail(data.email) ||
          isTestSalon(data.salon_name) ||
          deletedSalonIds.has(Number(data.salon_id)) ||
          deletedSalonIds.has(data.salon_id)
        ) {
          console.log(`Scheduling bookings deletion for ID: ${doc.id} (Salon: ${data.salon_name}, Client: ${data.email})`);
          bookingsBatch.delete(doc.ref);
          bookingCount++;
        }
      });
      if (bookingCount > 0) {
        await bookingsBatch.commit();
      }
      console.log(`✓ Deleted ${bookingCount} bookings from Firestore.`);

      // F. Reviews collection
      const reviewsSnapshot = await db.collection('reviews').get();
      const reviewsBatch = db.batch();
      let reviewCount = 0;
      reviewsSnapshot.forEach(doc => {
        const data = doc.data();
        if (
          deletedSalonIds.has(Number(data.salon_id)) ||
          deletedSalonIds.has(data.salon_id) ||
          deletedUserIds.has(Number(data.user_id)) ||
          deletedUserIds.has(data.user_id)
        ) {
          console.log(`Scheduling reviews deletion for ID: ${doc.id}`);
          reviewsBatch.delete(doc.ref);
          reviewCount++;
        }
      });
      if (reviewCount > 0) {
        await reviewsBatch.commit();
      }
      console.log(`✓ Deleted ${reviewCount} reviews from Firestore.`);

      // G. Newsletter collection
      const newsletterSnapshot = await db.collection('newsletter').get();
      const newsletterBatch = db.batch();
      let newsletterCount = 0;
      newsletterSnapshot.forEach(doc => {
        const data = doc.data();
        if (isTestEmail(data.email)) {
          console.log(`Scheduling newsletter deletion for ID: ${doc.id} (${data.email})`);
          newsletterBatch.delete(doc.ref);
          newsletterCount++;
        }
      });
      if (newsletterCount > 0) {
        await newsletterBatch.commit();
      }
      console.log(`✓ Deleted ${newsletterCount} newsletter subscriptions from Firestore.`);

      // H. Contacts collection
      const contactsSnapshot = await db.collection('contacts').get();
      const contactsBatch = db.batch();
      let contactCount = 0;
      contactsSnapshot.forEach(doc => {
        const data = doc.data();
        if (isTestEmail(data.email)) {
          console.log(`Scheduling contacts deletion for ID: ${doc.id} (${data.email})`);
          contactsBatch.delete(doc.ref);
          contactCount++;
        }
      });
      if (contactCount > 0) {
        await contactsBatch.commit();
      }
      console.log(`✓ Deleted ${contactCount} contact requests from Firestore.`);

      // I. Partners collection
      const partnersSnapshot = await db.collection('partners').get();
      const partnersBatch = db.batch();
      let partnerCount = 0;
      partnersSnapshot.forEach(doc => {
        const data = doc.data();
        if (isTestEmail(data.email) || isTestSalon(data.salonName)) {
          console.log(`Scheduling partners deletion for ID: ${doc.id} (${data.email})`);
          partnersBatch.delete(doc.ref);
          partnerCount++;
        }
      });
      if (partnerCount > 0) {
        await partnersBatch.commit();
      }
      console.log(`✓ Deleted ${partnerCount} partner requests from Firestore.`);

    } catch (err) {
      console.error('✕ Error deleting from Firestore:', err.message);
    }
  }

  // 3. Local JSON files Deletion
  console.log('\nCleaning up local JSON database files...');

  // A. Salons
  if (fs.existsSync(SALONS_PATH)) {
    const data = JSON.parse(fs.readFileSync(SALONS_PATH, 'utf8'));
    const updated = data.filter(s => !isTestSalon(s.name) && !deletedUserIds.has(Number(s.owner_id)) && !deletedUserIds.has(s.owner_id));
    fs.writeFileSync(SALONS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated salons.json (Count: ${data.length} -> ${updated.length})`);
  }

  // B. Users (in case it exists on disk)
  if (fs.existsSync(USERS_PATH)) {
    const data = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
    const updated = data.filter(u => !isTestEmail(u.email) && !deletedUserIds.has(Number(u.id)) && !deletedUserIds.has(u.id));
    fs.writeFileSync(USERS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated users.json (Count: ${data.length} -> ${updated.length})`);
  }

  // C. Profiles
  if (fs.existsSync(PROFILES_PATH)) {
    const data = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
    const updated = data.filter(p => !deletedUserIds.has(Number(p.user_id)) && !deletedUserIds.has(p.user_id));
    fs.writeFileSync(PROFILES_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated profiles.json (Count: ${data.length} -> ${updated.length})`);
  }

  // D. Beauty Profile
  if (fs.existsSync(BEAUTY_PROFILE_PATH)) {
    const data = JSON.parse(fs.readFileSync(BEAUTY_PROFILE_PATH, 'utf8'));
    const updated = data.filter(bp => !deletedUserIds.has(Number(bp.user_id)) && !deletedUserIds.has(bp.user_id));
    fs.writeFileSync(BEAUTY_PROFILE_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated beautyprofile.json (Count: ${data.length} -> ${updated.length})`);
  }

  // E. Bookings
  if (fs.existsSync(BOOKINGS_PATH)) {
    const data = JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf8'));
    const updated = data.filter(b => !isTestEmail(b.email) && !isTestSalon(b.salon_name) && !deletedSalonIds.has(Number(b.salon_id)) && !deletedSalonIds.has(b.salon_id));
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated bookings.json (Count: ${data.length} -> ${updated.length})`);
  }

  // F. Reviews
  if (fs.existsSync(REVIEWS_PATH)) {
    const data = JSON.parse(fs.readFileSync(REVIEWS_PATH, 'utf8'));
    const updated = data.filter(r => !deletedSalonIds.has(Number(r.salon_id)) && !deletedSalonIds.has(r.salon_id) && !deletedUserIds.has(Number(r.user_id)) && !deletedUserIds.has(r.user_id));
    fs.writeFileSync(REVIEWS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated reviews.json (Count: ${data.length} -> ${updated.length})`);
  }

  // G. Newsletter
  if (fs.existsSync(NEWSLETTER_PATH)) {
    const data = JSON.parse(fs.readFileSync(NEWSLETTER_PATH, 'utf8'));
    const updated = data.filter(n => !isTestEmail(n.email));
    fs.writeFileSync(NEWSLETTER_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated newsletter.json (Count: ${data.length} -> ${updated.length})`);
  }

  // H. Contacts
  if (fs.existsSync(CONTACTS_PATH)) {
    const data = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf8'));
    const updated = data.filter(c => !isTestEmail(c.email));
    fs.writeFileSync(CONTACTS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated contacts.json (Count: ${data.length} -> ${updated.length})`);
  }

  // I. Partners
  if (fs.existsSync(PARTNERS_PATH)) {
    const data = JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf8'));
    const updated = data.filter(p => !isTestEmail(p.email) && !isTestSalon(p.salonName));
    fs.writeFileSync(PARTNERS_PATH, JSON.stringify(updated, null, 2));
    console.log(`✓ Updated partners.json (Count: ${data.length} -> ${updated.length})`);
  }

  console.log('\n🎉 Test accounts and test data database cleanup completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('✕ Cleanup Script failed:', err);
  process.exit(1);
});
