import { NextResponse } from "next/server";
import * as adminService from "../../../lib/admin-service";

export async function POST(req: Request) {
  try {
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
    const body = await req.json();
    const { id, title, status, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field (id)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminUpdateTask(id, {
      title,
      status,
      description
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Update Task Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
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
