import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/firebase-admin";
import { adminUpdateAppHeartbeat } from "@/lib/admin-service";

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain } = body;

    if (!subdomain || typeof subdomain !== "string") {
      return NextResponse.json({ error: "Missing required field: subdomain" }, { status: 400 });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase();
    const result = await adminUpdateAppHeartbeat(cleanSubdomain);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST Bridge Heartbeat Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
