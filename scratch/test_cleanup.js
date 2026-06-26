const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    val = val.replace(/\\n/g, '\n');
    process.env[key] = val;
  });
}

loadEnv();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

const db = getFirestore();

async function cleanup() {
  try {
    console.log('Cleaning up test data from Firestore...');

    // Delete test project
    await db.collection('projects').doc('japanese-app-test').delete();
    console.log('- Deleted test project "japanese-app-test"');

    // Delete tasks associated with japanese-app-test
    const taskSnap = await db.collection('tasks').where('project_id', '==', 'japanese-app-test').get();
    for (const doc of taskSnap.docs) {
      await doc.ref.delete();
      console.log(`- Deleted test task ${doc.id}`);
    }

    // Delete activities associated with japanese-app-test
    const actSnap = await db.collection('activities').where('context.project_id', '==', 'japanese-app-test').get();
    for (const doc of actSnap.docs) {
      await doc.ref.delete();
      console.log(`- Deleted test activity/log ${doc.id}`);
    }

    console.log('Cleanup finished successfully!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

cleanup();
