import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";

// GET: Fetch milestones/tasks for a project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing required parameter: projectId" }, { status: 400 });
    }

    const snap = await adminDb.collection("tasks")
      .where("project_id", "==", projectId)
      .get();

    const tasks = snap.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate 
        ? data.created_at.toDate().toISOString() 
        : (data.created_at || new Date().toISOString());

      return {
        id: doc.id,
        projectId: data.project_id || data.projectId || projectId,
        project_id: data.project_id || data.projectId || projectId,
        name: data.name || data.title || "",
        title: data.title || data.name || "",
        status: data.status || "todo",
        created_at: createdAt
      };
    });

    // Sort by created_at ascending (standard order for tasks)
    tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("GET Portfolio Tasks Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Create a new milestone/task
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, status } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: "Missing required fields (projectId, name)" }, { status: 400 });
    }

    const docRef = adminDb.collection("tasks").doc();
    const created_at = new Date();

    const taskPayload = {
      id: docRef.id,
      project_id: projectId.trim(),
      projectId: projectId.trim(),
      name: name.trim(),
      title: name.trim(),
      status: status || "todo",
      created_at
    };

    await docRef.set(taskPayload);

    // Return 201 Created and the Document ID
    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST Portfolio Tasks Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
