export interface DbProfile {
  id: string;
  name: string;
  tagline: string;
  now: string;
  current_focus_description: string;
  created_at: string;
}

export interface DbContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface DbCertification {
  name: string;
  type: 'external' | 'internal';
  url?: string;
}

export interface DbPersona {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'exploring' | 'paused';
  visibility: 'public' | 'private';
  created_at: string;
  persona_evolutions?: DbPersonaEvolution[];
  contact_information?: DbContactInfo;
  goal?: string;
  description_of_self?: string;
  professional_summary?: string;
  certifications?: DbCertification[];
}

export interface DbPersonaEvolution {
  id: string;
  persona_id: string;
  date: string;
  description: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  title: string;
  description: string;
  status: 'exploring' | 'building' | 'shipped' | 'paused';
  current_focus: string | null;
  github_link: string | null;
  demo_link: string | null;
  notes_link: string | null;
  visibility: 'public' | 'private';
  company?: string | null;
  featured?: boolean;
  created_at: string;
  project_personas?: { persona_id: string }[];
}

export interface DbActivity {
  id: string;
  content: string;
  visibility: 'public' | 'private' | 'draft';
  created_at: string;
  event_type: 'chat' | 'milestone' | 'learning_reflection' | 'system_alert' | 'agent_log';
  tags?: string[];
  context: {
    persona_id?: string | null;
    project_id?: string | null;
    [key: string]: any;
  };
}

export type Role = "guest" | "user" | "root";

export interface DbUserRole {
  user_id: string;
  role: Role;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface DbTask {
  id: string;
  title: string;
  project_id: string;
  parent_id: string | null;
  description: string;
  status: TaskStatus;
  created_at: any;
}

export interface DbExperience {
  id: string;
  persona_id: string;
  created_at: string;
  content: {
    company: string;
    role?: string;
    time?: string;
    projects: {
      name: string;
      descriptions: string[];
    }[];
  }[];
  related_projects?: string[];
}

export interface DbSkill {
  id: string;
  persona_id: string;
  name: string;
  created_at: string;
}
