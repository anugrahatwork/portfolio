const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Simple helper to load .env.local file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    // Remove wrapping quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    // Replace literal \n with actual newline character for private keys
    val = val.replace(/\\n/g, '\n');
    process.env[key] = val;
  });
}

loadEnv();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing required Firebase Admin env vars in .env.local!');
  process.exit(1);
}

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

// Test API Key we will use: ak_live_testcurlkey1234567890abcdef1234567890abcdef
const testKey = 'ak_live_testcurlkey1234567890abcdef1234567890abcdef';
const keyHash = crypto.createHash('sha256').update(testKey).digest('hex');

async function run() {
  try {
    const docId = 'test_curl_key_id';
    const payload = {
      id: docId,
      name: 'Curl Test Key',
      key_hash: keyHash,
      truncated: 'ak_live_test...cdef',
      status: 'active',
      created_at: new Date().toISOString(),
      last_used: null
    };

    console.log('Writing test API key to Firestore...');
    await db.collection('api_keys').doc(docId).set(payload);
    console.log('Successfully wrote test key!');
    console.log('Key:', testKey);
    console.log('Hash:', keyHash);
    console.log('Doc ID:', docId);
  } catch (err) {
    console.error('Error inserting test key:', err);
  }
}

run();
