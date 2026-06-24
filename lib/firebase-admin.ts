import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

const isConfigured = 
  projectId && 
  clientEmail && 
  privateKey && 
  !projectId.includes('your_project_id') && 
  !privateKey.includes('your_private_key');

if (getApps().length === 0) {
  if (isConfigured) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Fallback/dummy init for local build compilation when env is missing or placeholders
    initializeApp({
      projectId: "dummy-project-id",
    });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
