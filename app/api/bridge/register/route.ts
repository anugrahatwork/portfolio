import { NextResponse } from "next/server";
import { verifyRequestAuth } from "@/lib/firebase-admin";
import { adminRegisterConnectedApp } from "@/lib/admin-service";

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain, port, name, project_id, type } = body;

    if (!subdomain || typeof subdomain !== "string" || !subdomain.trim()) {
      return NextResponse.json({ error: "Missing required field: subdomain" }, { status: 400 });
    }

    const localPort = parseInt(port, 10);
    if (isNaN(localPort) || localPort <= 0 || localPort > 65535) {
      return NextResponse.json({ error: "Invalid port number" }, { status: 400 });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const publicUrl = `https://${cleanSubdomain}.anugrahatwork.com`;

    const app = await adminRegisterConnectedApp({
      subdomain: cleanSubdomain,
      name: name || cleanSubdomain,
      project_id: project_id || null,
      local_port: localPort,
      type: type || "http",
      public_url: publicUrl,
    });

    return NextResponse.json({ success: true, data: app });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST Bridge Register Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
