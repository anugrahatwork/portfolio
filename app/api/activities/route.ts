import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, event_type, context, visibility, tags } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Missing required field (content)" },
        { status: 400 }
      );
    }

    // Insert activity directly into Firestore using server-side Admin SDK
    const docRef = adminDb.collection("activities").doc();
    const activityPayload = {
      id: docRef.id,
      content,
      visibility: visibility || "public",
      event_type: event_type || "chat",
      tags: tags || [],
      context: context || {},
      created_at: new Date()
    };

    await docRef.set(activityPayload);

    return NextResponse.json({ success: true, data: activityPayload });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Create Activity Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
