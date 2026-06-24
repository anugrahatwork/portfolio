const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load environment variables manually from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index > 0) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();

const firebaseProjectId = env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = env.FIREBASE_CLIENT_EMAIL;
let firebasePrivateKey = env.FIREBASE_PRIVATE_KEY;

if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
  console.error('Error: Firebase Admin credentials are not configured in .env.local.');
  process.exit(1);
}

firebasePrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');

try {
  initializeApp({
    credential: cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    })
  });
} catch (e) {
  // App might already be initialized if run in certain contexts
}

const db = getFirestore();

const uid = process.argv[2];
if (!uid) {
  console.error('Please specify your Firebase User UID. Usage:');
  console.error('  node scratch/set_admin_role.js <your_firebase_uid>');
  process.exit(1);
}

async function setAdminRole() {
  try {
    const docRef = db.collection('user_roles').doc(uid);
    await docRef.set({
      role: 'root',
      created_at: new Date().toISOString()
    });
    console.log(`Successfully assigned "root" admin role to UID: ${uid}`);
  } catch (error) {
    console.error('Failed to write user role to Firestore:', error);
  }
}

setAdminRole();
