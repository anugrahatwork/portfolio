import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as adminService from "../../../lib/admin-service";
import { verifyRequestAuth } from "@/lib/firebase-admin";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");


// Tool definitions for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "updateProfile",
        description: "Updates the user profile information like tagline or 'now' status.",
        parameters: {
          type: "object",
          properties: {
            tagline: { type: "string", description: "The new tagline." },
            now: { type: "string", description: "The new 'now' status description." },
            current_focus_description: { type: "string", description: "The new focus description." }
          }
        }
      },
      {
        name: "addActivity",
        description: "Adds a new activity log entry to the timeline.",
        parameters: {
          type: "object",
          properties: {
            content: { type: "string", description: "The content of the activity." },
            personaId: { type: "string", description: "The ID of the related persona (e.g., 'fullstack-developer')." },
            visibility: { type: "string", enum: ["public", "private", "draft"] }
          },
          required: ["content", "personaId"]
        }
      },
      {
        name: "createProject",
        description: "Creates a new project entry.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "A unique slug for the project." },
            title: { type: "string", description: "Project title." },
            description: { type: "string", description: "Project description." },
            status: { type: "string", enum: ["exploring", "building", "shipped", "paused"] }
          },
          required: ["id", "title", "description", "status"]
        }
      },
      {
        name: "createTask",
        description: "Creates a new task or subtask underneath a project. If parentId is provided, it creates a subtask under that parent task.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the task." },
            projectId: { type: "string", description: "The ID of the project this task belongs to. If not provided, it defaults to the active project." },
            parentId: { type: "string", description: "The UUID of the parent task, if creating a subtask." },
            description: { type: "string", description: "A detailed description of the task." }
          },
          required: ["title"]
        }
      },
      {
        name: "updateTask",
        description: "Updates an existing task's status, title, or description.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "The UUID of the task to update." },
            status: { type: "string", enum: ["todo", "in_progress", "done"], description: "The new status." },
            title: { type: "string", description: "The updated title." },
            description: { type: "string", description: "The updated description." }
          },
          required: ["taskId"]
        }
      }
    ]
  }
];

interface ToolArgs {
  tagline?: string;
  now?: string;
  current_focus_description?: string;
  content?: string;
  personaId?: string;
  visibility?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  projectId?: string;
  parentId?: string;
  taskId?: string;
}

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ reply: "UNAUTHORIZED: You must be logged in as admin to use the chatbot." }, { status: 401 });
    }

    const body = await req.json();
    const userMessage = body.message;
    const { activePersonaId, activeProjectId, activeTaskId } = body;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ reply: "SYSTEM ERROR: Gemini API Key is missing. Please add GOOGLE_GENERATIVE_AI_API_KEY to your .env.local." }, { status: 500 });
    }

    // 1. Persist user prompt in activities database
    if (activeProjectId && activePersonaId) {
      await adminService.adminCreateAgentLog({
        content: `@gemini ${userMessage}`,
        project_id: activeProjectId,
        task_id: activeTaskId || null,
        event_type: 'chat',
        persona_id: activePersonaId,
        is_agent: false // Sent by user
      });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any // SDK requires any for tool definitions
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    
    // Handle function calls
    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      const logsToInsert: string[] = [];
      for (const call of calls) {
        const { name, args } = call;
        const toolArgs = args as unknown as ToolArgs;
        
        console.log(`Executing AI Tool: ${name}`, toolArgs);

        if (name === "updateProfile") {
          await adminService.adminUpdateProfile(toolArgs as { tagline?: string; now?: string; current_focus_description?: string });
          logsToInsert.push("🤖 [Agent] Updated profile details.");
        } else if (name === "addActivity") {
          const act = await adminService.adminAddActivity({ 
            content: toolArgs.content || "", 
            visibility: toolArgs.visibility || "public" 
          }, toolArgs.personaId || body.activePersonaId || "");
          logsToInsert.push(`🤖 [Agent] Logged activity: "${act.content}"`);
        } else if (name === "createProject") {
          const proj = await adminService.adminCreateProject(
            toolArgs as { id: string; title: string; description: string; status: string },
            body.activePersonaId
          );
          logsToInsert.push(`🤖 [Agent] Created project: "#${proj.id}" ("${proj.title}")`);
        } else if (name === "createTask") {
          const taskData = await adminService.adminCreateTask({
            title: toolArgs.title || "",
            project_id: toolArgs.projectId || body.activeProjectId || "",
            parent_id: toolArgs.parentId || null,
            description: toolArgs.description || ""
          });
          logsToInsert.push(`🤖 [Agent] Created task: "${taskData.title}" under project "${taskData.project_id}"`);
        } else if (name === "updateTask") {
          const taskData = await adminService.adminUpdateTask(toolArgs.taskId || "", {
            title: toolArgs.title,
            status: toolArgs.status as "todo" | "in_progress" | "done" | undefined,
            description: toolArgs.description
          });
          logsToInsert.push(`🤖 [Agent] Updated task "${taskData.title}" status to "${taskData.status}"`);
        }
      }
      
      const confirmationText = "System updated successfully. I've executed the requested changes to your database.";
      
      // Save logs and confirmation message
      if (activeProjectId && activePersonaId) {
        for (const logMsg of logsToInsert) {
          await adminService.adminCreateAgentLog({
            content: logMsg,
            project_id: activeProjectId,
            task_id: activeTaskId || null,
            event_type: 'agent_log',
            persona_id: activePersonaId,
            is_agent: true
          });
        }
        
        await adminService.adminCreateAgentLog({
          content: `@gemini says: ${confirmationText}`,
          project_id: activeProjectId,
          task_id: activeTaskId || null,
          event_type: 'chat',
          persona_id: activePersonaId,
          is_agent: true
        });
      }

      return NextResponse.json({ reply: confirmationText });
    }

    const replyText = response.text();
    // Save standard text reply
    if (activeProjectId && activePersonaId) {
      await adminService.adminCreateAgentLog({
        content: `@gemini says: ${replyText}`,
        project_id: activeProjectId,
        task_id: activeTaskId || null,
        event_type: 'chat',
        persona_id: activePersonaId,
        is_agent: true
      });
    }

    return NextResponse.json({ reply: replyText });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Chat API Error:", errorMessage);
    return NextResponse.json({ reply: `ERROR: ${errorMessage}` }, { status: 500 });
  }
}
