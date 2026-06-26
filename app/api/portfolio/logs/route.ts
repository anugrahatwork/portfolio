import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";

// POST: Add a single log or batch of logs (Timeline Ledger / Activities Feed)
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, taskId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing required field: projectId" }, { status: 400 });
    }

    let logEntries: { message: string; timestamp?: string; parent_id?: string; parentId?: string }[] = [];

    // Check if it's bulk or single
    if (Array.isArray(body.logs)) {
      logEntries = body.logs;
    } else if (body.message) {
      logEntries = [{ 
        message: body.message, 
        timestamp: body.timestamp, 
        parent_id: body.parent_id || body.parentId 
      }];
    } else {
      return NextResponse.json({ error: "Missing logs array or message field" }, { status: 400 });
    }

    // Validate that there is at least one log entry
    if (logEntries.length === 0) {
      return NextResponse.json({ error: "No log entries provided" }, { status: 400 });
    }

    // Perform Firestore Batch Write
    const batch = adminDb.batch();
    const createdIds: string[] = [];
    const activitiesCollection = adminDb.collection("activities");

    for (const log of logEntries) {
      if (!log.message || !log.message.trim()) {
        return NextResponse.json({ error: "Log entries must contain a valid message" }, { status: 400 });
      }

      const docRef = activitiesCollection.doc();
      const createdAtDate = log.timestamp ? new Date(log.timestamp) : new Date();

      const parentIdVal = log.parent_id || log.parentId || body.parent_id || body.parentId;

      const logPayload = {
        id: docRef.id,
        content: log.message.trim(),
        visibility: "public",
        event_type: "agent_log",
        created_at: createdAtDate,
        context: {
          project_id: projectId.trim(),
          task_id: taskId ? taskId.trim() : null,
          parent_id: parentIdVal ? parentIdVal.trim() : null,
          is_agent: true,
          agent_name: "Antigravity",
          persona_id: "fullstack-developer" // standard default persona in current app
        }
      };

      batch.set(docRef, logPayload);
      createdIds.push(docRef.id);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      count: logEntries.length,
      ids: createdIds
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST Portfolio Logs Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
