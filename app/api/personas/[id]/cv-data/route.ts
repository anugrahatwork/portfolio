import { NextResponse } from "next/server";
import { verifyRequestAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Persona ID is required" }, { status: 400 });
    }

    // Fetch using Admin SDK to bypass Firestore rules for this secured route
    const expSnap = await adminDb.collection("experiences").where("persona_id", "==", id).get();
    const experiences = expSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    });
    experiences.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const skillsSnap = await adminDb.collection("skills").where("persona_id", "==", id).get();
    const skills = skillsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
      };
    });
    skills.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ experiences, skills });
  } catch (error: any) {
    console.error("Error fetching CV data:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
