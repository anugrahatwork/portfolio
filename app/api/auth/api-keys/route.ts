import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";
import crypto from "crypto";

// GET: List all API keys
export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snap = await adminDb.collection("api_keys").get();
    const keys = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        truncated: data.truncated,
        status: data.status,
        created_at: data.created_at,
        last_used: data.last_used
      };
    });

    // Sort by created_at descending (latest first)
    keys.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: keys });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("GET API Keys Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Create a new API key
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    // Generate secure random key: ak_live_ + 48 hex characters
    const rawKey = "ak_live_" + crypto.randomBytes(24).toString("hex");
    const key_hash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const truncated = "ak_live_" + rawKey.slice(8, 12) + "..." + rawKey.slice(-4);

    const docRef = adminDb.collection("api_keys").doc();
    const created_at = new Date().toISOString();

    const payload = {
      id: docRef.id,
      name: name.trim(),
      key_hash,
      truncated,
      status: "active",
      created_at,
      last_used: null
    };

    await docRef.set(payload);

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        name: payload.name,
        truncated: payload.truncated,
        status: payload.status,
        created_at: payload.created_at,
        last_used: payload.last_used,
        key: rawKey // Returned exactly once to the client
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST API Keys Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE: Revoke/delete an API key
export async function DELETE(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    await adminDb.collection("api_keys").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("DELETE API Keys Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
