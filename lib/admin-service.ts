import { adminDb } from './firebase-admin';

export async function adminUpdateProfile(updates: { tagline?: string; now?: string; current_focus_description?: string }) {
  const snapshot = await adminDb.collection('profiles').where('name', '==', 'Anugrah Zeputra').get();
  
  if (snapshot.empty) {
    // Create profile if missing
    const ref = await adminDb.collection('profiles').add({
      name: 'Anugrah Zeputra',
      created_at: new Date(),
      ...updates
    });
    return { id: ref.id };
  }
  
  const docRef = snapshot.docs[0].ref;
  await docRef.update(updates);
  return { id: docRef.id };
}

export async function adminCreateProject(
  project: { id: string; title: string; description: string; status: string },
  personaId?: string
) {
  const docRef = adminDb.collection('projects').doc(project.id);
  const projectPayload = {
    ...project,
    relatedPersonas: personaId ? [personaId] : [],
    created_at: new Date()
  };
  await docRef.set(projectPayload);
  return projectPayload;
}

export async function adminUpdateProject(id: string, updates: Partial<any>): Promise<any> {
  const docRef = adminDb.collection('projects').doc(id);
  await docRef.update(updates);
  const snap = await docRef.get();
  return { id, ...snap.data() };
}

export async function adminAddActivity(activity: { content: string; visibility: string; event_type?: string }, personaId: string) {
  const docRef = adminDb.collection('activities').doc();
  const activityPayload = {
    id: docRef.id,
    content: activity.content,
    visibility: activity.visibility || 'public',
    event_type: activity.event_type || 'learning_reflection',
    created_at: new Date(),
    context: {
      persona_id: personaId
    }
  };
  await docRef.set(activityPayload);
  return activityPayload;
}

export async function adminCreatePersona(persona: {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'exploring' | 'paused';
  visibility?: 'public' | 'private';
}) {
  const docRef = adminDb.collection('personas').doc(persona.id);
  const personaPayload = {
    ...persona,
    created_at: new Date()
  };
  await docRef.set(personaPayload);
  return personaPayload;
}

export async function adminUpdatePersona(
  id: string,
  updates: Partial<import('./types').DbPersona>
): Promise<any> {
  const docRef = adminDb.collection('personas').doc(id);
  await docRef.update(updates);
  const snap = await docRef.get();
  return { id, ...snap.data() };
}

export async function adminCreateExperience(experience: { persona_id: string; content: string[]; related_projects?: string[] }) {
  const docRef = adminDb.collection('experiences').doc();
  const payload = {
    id: docRef.id,
    ...experience,
    created_at: new Date()
  };
  await docRef.set(payload);
  return payload;
}

export async function adminDeleteExperiencesByPersona(personaId: string) {
  const snapshot = await adminDb.collection('experiences').where('persona_id', '==', personaId).get();
  const batch = adminDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

export async function adminCreateSkill(skill: { persona_id: string; name: string }) {
  const docRef = adminDb.collection('skills').doc();
  const payload = {
    id: docRef.id,
    ...skill,
    created_at: new Date()
  };
  await docRef.set(payload);
  return payload;
}

export async function adminDeleteSkillsByPersona(personaId: string) {
  const snapshot = await adminDb.collection('skills').where('persona_id', '==', personaId).get();
  const batch = adminDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

export async function adminDeletePersona(id: string) {
  const docRef = adminDb.collection('personas').doc(id);
  await docRef.delete();
  return { id };
}

export async function adminCreateTask(task: { title: string; project_id: string; parent_id?: string | null; description?: string }) {
  const docRef = adminDb.collection('tasks').doc();
  const taskPayload = {
    id: docRef.id,
    title: task.title,
    project_id: task.project_id,
    parent_id: task.parent_id || null,
    description: task.description || "",
    status: 'todo',
    created_at: new Date()
  };
  await docRef.set(taskPayload);
  return taskPayload;
}

export async function adminUpdateTask(id: string, updates: { title?: string; status?: string; description?: string }): Promise<any> {
  const docRef = adminDb.collection('tasks').doc(id);
  await docRef.update(updates);
  const snap = await docRef.get();
  return { id, ...snap.data() };
}

export async function adminDeleteTask(id: string) {
  const docRef = adminDb.collection('tasks').doc(id);
  await docRef.delete();
  return { id };
}

export async function adminUpdateProjectSharing(projectId: string, personaIds: string[]) {
  const docRef = adminDb.collection('projects').doc(projectId);
  await docRef.update({
    relatedPersonas: personaIds
  });
}

export async function adminCreateAgentLog(log: {
  content: string;
  project_id: string;
  task_id?: string | null;
  event_type?: string;
  persona_id?: string;
  is_agent?: boolean;
}) {
  const isAgent = log.is_agent !== undefined ? log.is_agent : true;
  const contextPayload: any = {
    persona_id: log.persona_id || 'fullstack-developer',
    project_id: log.project_id,
    is_agent: isAgent
  };

  if (isAgent) {
    contextPayload.agent_name = 'Antigravity';
  }

  if (log.task_id) {
    contextPayload.task_id = log.task_id;
  }

  const docRef = adminDb.collection('activities').doc();
  const activityPayload = {
    id: docRef.id,
    content: log.content,
    visibility: 'public',
    event_type: log.event_type || 'agent_log',
    created_at: new Date(),
    context: contextPayload
  };

  await docRef.set(activityPayload);
  return activityPayload;
}

export async function adminUpdateExperience(id: string, updates: { content?: any }): Promise<any> {
  const docRef = adminDb.collection('experiences').doc(id);
  await docRef.update(updates);
  const snap = await docRef.get();
  return { id, ...snap.data() };
}
