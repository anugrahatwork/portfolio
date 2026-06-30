import { NextResponse } from "next/server";
import * as adminService from "../../../lib/admin-service";
import { verifyRequestAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const personasSnap = await adminDb.collection("personas").get();
    const personas = personasSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(personas);
  } catch (error: any) {
    console.error("API Get Personas Error:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, status, visibility } = body;

    if (!id || !name || !status) {
      return NextResponse.json(
        { error: "Missing required fields (id, name, status)" },
        { status: 400 }
      );
    }

    // Enforce slug format (lowercase alphanumeric and dashes)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(id)) {
      return NextResponse.json(
        { error: "ID must be a slug (lowercase letters, numbers, and dashes only)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminCreatePersona({
      id,
      name,
      description: description || "",
      status,
      visibility: visibility || "public"
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Create Persona Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, status, visibility, updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field (id)" },
        { status: 400 }
      );
    }

    // Merge direct fields with updates object if provided
    const payload = {
      name,
      description,
      status,
      visibility,
      ...(updates || {})
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const data = await adminService.adminUpdatePersona(id, payload);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Update Persona Error:", errorMessage);
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter (id)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminDeletePersona(id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Delete Persona Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
