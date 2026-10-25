import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/firebase-admin";
import { adminGetConnectedApps, adminDeleteConnectedApp } from "@/lib/admin-service";

export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apps = await adminGetConnectedApps();
    return NextResponse.json({ success: true, data: apps });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("GET Bridge Apps Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get("subdomain");

    if (!subdomain) {
      return NextResponse.json({ error: "Missing subdomain parameter" }, { status: 400 });
    }

    const result = await adminDeleteConnectedApp(subdomain);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("DELETE Bridge App Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
