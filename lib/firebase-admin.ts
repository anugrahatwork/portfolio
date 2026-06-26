import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

// Verify request authorization (Firebase ID Token or API Key)
export async function verifyRequestAuth(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('x-api-key');

    let tokenOrKey = '';

    // 1. Resolve Auth Token / Key
    if (apiKeyHeader) {
      tokenOrKey = apiKeyHeader.trim();
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenOrKey = authHeader.split('Bearer ')[1].trim();
    } else {
      // Fallback to cookie
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/firebase-token=([^;]+)/);
        if (match) {
          tokenOrKey = match[1].trim();
        }
      }
    }

    if (!tokenOrKey) {
      return false;
    }

    // 2. Check if it's an API Key (starts with ak_live_)
    if (tokenOrKey.startsWith('ak_live_')) {
      const hash = crypto.createHash('sha256').update(tokenOrKey).digest('hex');
      const keySnap = await adminDb.collection('api_keys')
        .where('key_hash', '==', hash)
        .limit(1)
        .get();

      if (keySnap.empty) {
        return false;
      }

      const keyDoc = keySnap.docs[0];
      const keyData = keyDoc.data();

      if (keyData.status !== 'active') {
        return false;
      }

      // Update last used in background (non-blocking)
      keyDoc.ref.update({
        last_used: new Date().toISOString()
      }).catch(err => console.error("Failed to update last_used for API key:", err));

      return true;
    }

    // 3. Fallback to Firebase ID Token validation
    const decodedToken = await adminAuth.verifyIdToken(tokenOrKey);
    const userId = decodedToken.uid;
    
    // Check role in user_roles collection
    const roleDoc = await adminDb.collection('user_roles').doc(userId).get();
    if (!roleDoc.exists) return false;
    
    const roleData = roleDoc.data();
    return roleData?.role === 'root';
  } catch (err) {
    console.error("verifyRequestAuth error:", err);
    return false;
  }
}

