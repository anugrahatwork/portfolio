import { db } from './firebase';
import { collection, getDocs, getDoc, doc, query, where, limit, orderBy } from 'firebase/firestore';
import { DbProfile, DbPersona, DbProject, DbActivity, Role, DbPersonaEvolution, DbExperience, DbSkill } from './types';

export async function getUserRole(userId: string): Promise<Role> {
  try {
    const roleDoc = await getDoc(doc(db, "user_roles", userId));
    if (!roleDoc.exists()) return "user";
    return (roleDoc.data().role as Role) || "user";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "user"; // Default to basic user if not found
  }
}

export async function getProfile(): Promise<DbProfile> {
  const q = query(collection(db, "profiles"), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    throw new Error("Profile not found in Firestore. Please seed data first.");
  }
  
  const profileDoc = snap.docs[0];
  const data = profileDoc.data();
  
  return {
    id: profileDoc.id,
    name: data.name || "Anugrah Zeputra",
    tagline: data.tagline || "",
    now: data.now || "",
    current_focus_description: data.current_focus_description || "",
    created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
  } as DbProfile;
}

export async function getPersonas(): Promise<DbPersona[]> {
  const snap = await getDocs(collection(db, "personas"));
  const personas = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      name: data.name || "",
      description: data.description || "",
      status: data.status || "active",
      visibility: data.visibility || "public",
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString()),
      persona_evolutions: []
    } as DbPersona;
  });

  // Fetch subcollection "persona_evolutions" for each persona
  for (const persona of personas) {
    try {
      const evoSnap = await getDocs(collection(db, `personas/${persona.id}/persona_evolutions`));
      const evos = evoSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
        } as DbPersonaEvolution;
      });
      // Sort evos by date descending
      evos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      persona.persona_evolutions = evos;
    } catch (e) {
      console.warn(`No evolutions subcollection for persona ${persona.id}`, e);
    }
  }

  // Sort personas by created_at ascending
  personas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return personas;
}

export async function getProjects(): Promise<(DbProject & { relatedPersonas: string[] })[]> {
  const snap = await getDocs(collection(db, "projects"));
  const projects = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      relatedPersonas: data.relatedPersonas || [],
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    } as DbProject & { relatedPersonas: string[] };
  });

  // Sort projects by created_at descending
  projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return projects;
}

export async function getActivities(filters?: {
  personaId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
}): Promise<DbActivity[]> {
  let q = query(collection(db, "activities"));

  if (filters) {
    if (filters.taskId) {
      q = query(collection(db, "activities"), where("context.task_id", "==", filters.taskId));
    } else if (filters.projectId) {
      q = query(collection(db, "activities"), where("context.project_id", "==", filters.projectId));
    } else if (filters.personaId) {
      q = query(collection(db, "activities"), where("context.persona_id", "==", filters.personaId));
    }
  }

  const snap = await getDocs(q);
  let activities = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    } as DbActivity;
  });

  // Filter project-level activities (excluding tasks) client-side
  if (filters?.projectId && !filters.taskId) {
    activities = activities.filter(a => !a.context?.task_id);
  }

  // Sort by created_at descending (latest first)
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return activities;
}

export async function getTasksForProject(projectId: string): Promise<any[]> {
  const q = query(collection(db, "tasks"), where("project_id", "==", projectId));
  const snap = await getDocs(q);
  const tasks = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    };
  });

  // Sort by created_at ascending
  tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return tasks;
}

export async function getAllTasks(): Promise<any[]> {
  const snap = await getDocs(collection(db, "tasks"));
  const tasks = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    };
  });
  tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return tasks;
}

export async function getExperiences(personaId: string): Promise<DbExperience[]> {
  const q = query(collection(db, "experiences"), where("persona_id", "==", personaId));
  const snap = await getDocs(q);
  const experiences = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    } as DbExperience;
  });
  experiences.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return experiences;
}

export async function getSkills(personaId: string): Promise<DbSkill[]> {
  const q = query(collection(db, "skills"), where("persona_id", "==", personaId));
  const snap = await getDocs(q);
  const skills = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
    } as DbSkill;
  });
  skills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return skills;
}
