import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!email || email !== adminEmail) {
      return NextResponse.json({ 
        success: false, 
        error: `Access denied: ${email} is not the configured administrator email.` 
      }, { status: 403 });
    }

    // Set role = root in user_roles collection
    await adminDb.collection('user_roles').doc(userId).set({
      role: 'root',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error setting admin role:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
