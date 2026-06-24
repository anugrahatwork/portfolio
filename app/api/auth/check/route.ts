import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check user roles in Firestore
    const roleDoc = await adminDb.collection('user_roles').doc(userId).get();
    if (!roleDoc.exists || roleDoc.data()?.role !== 'root') {
      return NextResponse.json({ authorized: false }, { status: 403 });
    }

    return NextResponse.json({ authorized: true });
  } catch (error) {
    console.error("Auth check API error:", error);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}
