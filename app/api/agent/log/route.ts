import { NextResponse } from "next/server";
import * as adminService from "../../../../lib/admin-service";
import { verifyRequestAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, projectId, taskId, eventType, personaId } = body;

    if (!content || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields (content, projectId)" },
        { status: 400 }
      );
    }

    const data = await adminService.adminCreateAgentLog({
      content,
      project_id: projectId,
      task_id: taskId || null,
      event_type: eventType || 'agent_log',
      persona_id: personaId
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Create Agent Log Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
