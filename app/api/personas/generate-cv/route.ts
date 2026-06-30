import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";
import * as adminService from "@/lib/admin-service";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
    }

    const body = await req.json();
    const { personaId, forceRegenerate } = body;

    if (!personaId) {
      return NextResponse.json({ error: "personaId is required" }, { status: 400 });
    }

    // 1. Fetch Persona
    const personaDoc = await adminDb.collection('personas').doc(personaId).get();
    if (!personaDoc.exists) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }
    const persona = personaDoc.data() as any;

    // 2. Fetch Latest Experience
    const expSnap = await adminDb.collection('experiences')
      .where('persona_id', '==', personaId)
      .get();
    
    let lastExperienceDate: Date | null = null;
    let existingExperiencePoints: string[] = [];

    if (!expSnap.empty && !forceRegenerate) {
      // Sort in memory to avoid composite index requirement
      const exps = expSnap.docs.map(doc => doc.data());
      exps.sort((a, b) => {
        const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
        const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
      });
      
      const latestExpData = exps[0];
      lastExperienceDate = latestExpData.created_at?.toDate ? latestExpData.created_at.toDate() : new Date(latestExpData.created_at);
      existingExperiencePoints = latestExpData.content || [];
    }

    // 3. Fetch Activities
    const activitiesSnap = await adminDb.collection('activities')
      .where('context.persona_id', '==', personaId)
      .get();
      
    // Filter and sort in memory to avoid composite index requirement
    let allActivities = activitiesSnap.docs.map(doc => doc.data());
    
    if (lastExperienceDate) {
      allActivities = allActivities.filter(a => {
        const time = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
        return time > lastExperienceDate!.getTime();
      });
    }
    
    allActivities.sort((a, b) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
      return timeA - timeB;
    });
    
    if (allActivities.length === 0 && existingExperiencePoints.length > 0 && !forceRegenerate) {
      return NextResponse.json({ message: "No new activities to process." });
    }

    const activitiesData = allActivities;

    // Fetch related projects and tasks for hierarchical formatting
    const projectIds = [...new Set(activitiesData.map(a => a.context?.project_id).filter(Boolean))];
    const taskIds = [...new Set(activitiesData.map(a => a.context?.task_id).filter(Boolean))];

    const projectsMap: Record<string, { label: string, status: string }> = {};
    const tasksMap: Record<string, string> = {};

    if (projectIds.length > 0) {
      // Chunk queries to handle Firestore 'in' limit of 10 if necessary (assuming <10 for now)
      // For safety, let's just fetch them individually or use a simple loop
      for (const pId of projectIds) {
        if(typeof pId === 'string') {
          const pDoc = await adminDb.collection('projects').doc(pId).get();
          if (pDoc.exists) {
            const pData = pDoc.data();
            let label = pData?.title || "Unknown Project";
            if (pData?.company) {
              label += ` (Company: ${pData.company})`;
            } else {
              label += ` (Company: anugrahatwork.com)`;
            }
            projectsMap[pId] = { label, status: pData?.status || 'exploring' };
          }
        }
      }
    }

    if (taskIds.length > 0) {
      for (const tId of taskIds) {
        if(typeof tId === 'string') {
          const tDoc = await adminDb.collection('tasks').doc(tId).get();
          if (tDoc.exists) tasksMap[tId] = tDoc.data()?.title || "Unknown Task";
        }
      }
    }

    // Group activities
    // Format: 
    // Project Title:
    //  - Task Title
    //    - Activity Content
    // Or if no project/task: just activity content
    
    const formattedActivities: string[] = [];
    const groupedByProject: Record<string, Record<string, any[]>> = {};

    activitiesData.forEach((act: any) => {
      const pId = act.context?.project_id || "unassigned_project";
      const tId = act.context?.task_id || "unassigned_task";
      
      if (!groupedByProject[pId]) groupedByProject[pId] = {};
      if (!groupedByProject[pId][tId]) groupedByProject[pId][tId] = [];
      
      groupedByProject[pId][tId].push(act);
    });

    for (const [pId, tasksGrp] of Object.entries(groupedByProject)) {
      if (pId !== "unassigned_project") {
        const pInfo = projectsMap[pId];
        formattedActivities.push(`Project: ${pInfo?.label || pId}`);
        
        // Calculate Timeline
        const allProjectActs = Object.values(tasksGrp).flat();
        if (allProjectActs.length > 0) {
          const times = allProjectActs.map(a => 
            a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
          ).filter(t => !isNaN(t));
          
          if (times.length > 0) {
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            const startStr = new Date(minTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            let endStr = "Present";
            
            if (pInfo && (pInfo.status === 'shipped' || pInfo.status === 'paused')) {
              endStr = new Date(maxTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
            
            formattedActivities.push(`[Timeline: ${startStr} - ${endStr}]`);
          }
        }
      }
      
      for (const [tId, acts] of Object.entries(tasksGrp)) {
        let prefix = " - ";
        if (tId !== "unassigned_task") {
          if (pId !== "unassigned_project") {
            formattedActivities.push(`  - Task: ${tasksMap[tId] || tId}`);
            prefix = "    - Log: ";
          } else {
            formattedActivities.push(`Task: ${tasksMap[tId] || tId}`);
            prefix = " - Log: ";
          }
        } else if (pId !== "unassigned_project") {
          prefix = "  - Log: ";
        }
        
        acts.forEach(a => {
          let dateStr = "";
          if (a.created_at) {
            try {
              dateStr = `[${(a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at)).toISOString().split('T')[0]}] `;
            } catch (e) {
              dateStr = "";
            }
          }
          formattedActivities.push(`${prefix}${dateStr}${a.content}`);
        });
      }
    }

    // 4. Prompt Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `
You are an expert CV and Portfolio Builder AI.
You are updating the professional profile for a persona named "${persona.name}".

CURRENT PERSONA INFO:
Goal: ${persona.goal || "Not defined yet."}
Description of self: ${persona.description_of_self || "Not defined yet."}

EXISTING EXPERIENCE (Bullet Points):
${existingExperiencePoints.length > 0 ? existingExperiencePoints.map((e: string) => "- " + e).join("\n") : "None."}

NEW ACTIVITIES TO INTEGRATE:
${formattedActivities.length > 0 ? formattedActivities.join("\n") : "None."}

TASK:
1. Generate a single cohesive "professional_summary" paragraph that introduces this person as a professional based on their past goal, description, and their newly added activities (e.g. "I am a Software Engineer with a passion for using AI and solving complex programming challenges...").
2. Restructure and merge the new activities into their existing experience. Organize all experience hierarchically: Group them first by Company, then by Project, and finally output bullet points of achievements for that project.
3. IMPORTANT: For each Company cluster, output a professional "role" (job title). For the "time" field, you MUST accurately aggregate the explicit \`[Timeline: Start - End]\` tags provided above the activity logs. Do NOT guess timestamps. Output a clean, single timeframe (e.g. "Jan 2024 - Present") spanning the earliest Start date and latest End date of all projects in that company.
4. IMPORTANT NDA GUARD: Do NOT include any highly sensitive proprietary information, exact revenues, internal code names, or confidential client data in the generated CV. Generalize or omit such details.
5. Extract a comprehensive list of skills (strings) demonstrated in both the existing experience and new activities.

OUTPUT JSON FORMAT:
{
  "professional_summary": "string",
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "time": "string",
      "projects": [
        {
          "name": "string",
          "descriptions": ["string", "string"]
        }
      ]
    }
  ],
  "skills": ["string", "string"]
}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const generatedData = JSON.parse(text);

    // 5. Save back to Firestore
    
    // Update Persona
    await adminService.adminUpdatePersona(personaId, {
      professional_summary: generatedData.professional_summary
    });

    // Create new Experience
    const newExp = await adminService.adminCreateExperience({
      persona_id: personaId,
      content: generatedData.experiences,
      related_projects: [] 
    });

    // Delete old skills and recreate them
    await adminService.adminDeleteSkillsByPersona(personaId);
    const skillPromises = generatedData.skills.map((skillName: string) => 
      adminService.adminCreateSkill({ persona_id: personaId, name: skillName })
    );
    await Promise.all(skillPromises);

    return NextResponse.json({ 
      success: true, 
      data: {
        professional_summary: generatedData.professional_summary,
        experience: newExp,
        skills: generatedData.skills
      }
    });

  } catch (error: any) {
    console.error("CV Generation API Error:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
