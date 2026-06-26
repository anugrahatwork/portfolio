import { NextResponse } from "next/server";
import * as adminService from "../../../lib/admin-service";
import { verifyRequestAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, status, personaId } = body;

    if (!id || !title || !status) {
      return NextResponse.json(
        { error: "Missing required fields (id, title, status)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminCreateProject(
      { id, title, description, status },
      personaId
    );

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Create Project Error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, personaIds } = body;

    if (!projectId || !Array.isArray(personaIds)) {
      return NextResponse.json(
        { error: "Missing required fields (projectId, personaIds)" },
        { status: 400 }
      );
    }

    await adminService.adminUpdateProjectSharing(projectId, personaIds);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Share Project Error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
