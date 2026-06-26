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
    const { title, project_id, parent_id, description } = body;

    if (!title || !project_id) {
      return NextResponse.json(
        { error: "Missing required fields (title, project_id)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminCreateTask({
      title,
      project_id,
      parent_id: parent_id || null,
      description: description || ""
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Create Task Error:", errorMessage);
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
    const { id, title, status, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field (id)" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) {
      const allowedStatuses = ["todo", "in_progress", "done"];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status '${status}'. Allowed values: ${allowedStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }
    if (description !== undefined) updates.description = description;

    const data = await adminService.adminUpdateTask(id, updates);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Update Task Error:", errorMessage);
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

    const data = await adminService.adminDeleteTask(id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Delete Task Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
