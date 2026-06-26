import { NextResponse } from "next/server";
import { adminDb, verifyRequestAuth } from "@/lib/firebase-admin";

// GET: Fetch all projects
export async function GET() {
  try {
    const snap = await adminDb.collection("projects").get();
    const projects = snap.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate 
        ? data.created_at.toDate().toISOString() 
        : (data.created_at || new Date().toISOString());

      return {
        id: doc.id,
        slug: doc.id,
        name: data.name || data.title || "",
        title: data.title || data.name || "",
        description: data.description || "",
        techStack: data.techStack || [],
        status: data.status || "building",
        visibility: data.visibility || "public",
        relatedPersonas: data.relatedPersonas || [],
        created_at: createdAt
      };
    });

    // Sort by created_at descending (latest projects first)
    projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: projects });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("GET Portfolio Projects Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Create a new project profile
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyRequestAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, description, techStack } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required fields (name, slug)" }, { status: 400 });
    }

    const slugTrimmed = slug.trim();
    const docRef = adminDb.collection("projects").doc(slugTrimmed);
    
    // Check if the project already exists
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return NextResponse.json({ error: `Project with slug '${slugTrimmed}' already exists` }, { status: 409 });
    }

    const created_at = new Date();

    const projectPayload = {
      id: slugTrimmed,
      slug: slugTrimmed,
      name: name.trim(),
      title: name.trim(),
      description: description || "",
      techStack: techStack || [],
      status: "building",
      visibility: "public",
      relatedPersonas: [],
      created_at
    };

    await docRef.set(projectPayload);

    return NextResponse.json({ 
      success: true, 
      data: {
        ...projectPayload,
        created_at: created_at.toISOString()
      } 
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("POST Portfolio Projects Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
