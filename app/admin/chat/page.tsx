"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getPersonas, getProjects, getActivities, getTasksForProject } from "../../../lib/data-service";
import { DbPersona, DbProject, DbActivity } from "../../../lib/types";
import { db } from "../../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { EditProjectModal } from "../components/EditProjectModal";

export default function DiscordChat() {
  // Data State
  const [personas, setPersonas] = useState<DbPersona[]>([]);
  const [projects, setProjects] = useState<(DbProject & { relatedPersonas: string[] })[]>([]);
  
  // Cache States
  const [activitiesCache, setActivitiesCache] = useState<Record<string, DbActivity[]>>({});
  const [tasksCache, setTasksCache] = useState<Record<string, any[]>>({});
  const [fetchingActivities, setFetchingActivities] = useState(false);
  const [fetchingTasks, setFetchingTasks] = useState(false);

  // Selection State
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<DbProject | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [chatInput, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // New Project Form State
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectSlug, setNewProjectSlug] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("exploring");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // New Task Form State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskParentId, setNewTaskParentId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});

  // Project Sharing State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharingPersonaIds, setSharingPersonaIds] = useState<string[]>([]);
  const [savingShare, setSavingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Persona CRUD State
  const [isAddPersonaOpen, setIsAddPersonaOpen] = useState(false);
  const [isEditPersonaOpen, setIsEditPersonaOpen] = useState(false);
  const [isDeletePersonaOpen, setIsDeletePersonaOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<DbPersona | null>(null);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);

  // Persona Form Fields
  const [personaFormId, setPersonaFormId] = useState("");
  const [personaFormName, setPersonaFormName] = useState("");
  const [personaFormDesc, setPersonaFormDesc] = useState("");
  const [personaFormStatus, setPersonaFormStatus] = useState<"active" | "exploring" | "paused">("exploring");
  const [personaFormVisibility, setPersonaFormVisibility] = useState<"public" | "private">("public");

  // Fetch initial data (only projects and personas)
  const loadInitialData = useCallback(async () => {
    try {
      const [pData, projData] = await Promise.all([
        getPersonas(),
        getProjects()
      ]);
      setPersonas(pData);
      setProjects(projData);
      
      if (pData.length > 0 && !activePersonaId) {
        setActivePersonaId(pData[0].id);
      }
    } catch (error) {
      console.error("Error loading chat data:", error);
    } finally {
      setLoading(false);
    }
  }, [activePersonaId]);

  // Derive cache key based on selection scope
  const cacheKey = useMemo(() => {
    if (activeTaskId) return `task:${activeTaskId}`;
    if (activeProjectId) return `project:${activeProjectId}`;
    return null;
  }, [activeTaskId, activeProjectId]);

  const filteredMessages = useMemo(() => {
    if (!cacheKey) return [];
    const msgs = activitiesCache[cacheKey] || [];
    return [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [activitiesCache, cacheKey]);

  // Real-time synchronization for activities (Filtered by current selections)
  useEffect(() => {
    const key = cacheKey;
    if (!key) return;

    let q = query(collection(db, "activities"));
    
    if (activeTaskId) {
      q = query(collection(db, "activities"), where("context.task_id", "==", activeTaskId));
    } else if (activeProjectId) {
      q = query(collection(db, "activities"), where("context.project_id", "==", activeProjectId));
    } else if (activePersonaId) {
      q = query(collection(db, "activities"), where("context.persona_id", "==", activePersonaId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activities = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
        } as DbActivity;
      });

      // Filter tasks client-side if project is selected but not task
      if (activeProjectId && !activeTaskId) {
        activities = activities.filter(a => !a.context?.task_id);
      }

      // Sort by created_at descending (latest first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivitiesCache(prev => ({
        ...prev,
        [key]: activities
      }));
    }, (error) => {
      console.error("Firestore onSnapshot error for activities in admin:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [activePersonaId, activeProjectId, activeTaskId, cacheKey]);

  // Real-time synchronization for tasks (Filtered by active project)
  useEffect(() => {
    if (!activeProjectId) return;
    const projId = activeProjectId;

    const q = query(collection(db, "tasks"), where("project_id", "==", projId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
        };
      });

      // Sort by created_at ascending
      tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setTasksCache(prev => ({
        ...prev,
        [projId]: tasks
      }));
    }, (error) => {
      console.error("Firestore onSnapshot error for tasks in admin:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [activeProjectId]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-time synchronization for personas and projects updates
  useEffect(() => {
    const unsubPersonas = onSnapshot(collection(db, "personas"), () => {
      loadInitialData();
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), () => {
      loadInitialData();
    });
    return () => {
      unsubPersonas();
      unsubProjects();
    };
  }, [loadInitialData]);

  // Filter projects based on persona
  const filteredProjects = useMemo(() => 
    activePersonaId 
      ? projects.filter(p => p.relatedPersonas.includes(activePersonaId))
      : [], [activePersonaId, projects]);

  // Filter tasks based on active project
  const projectTasks = useMemo(() => {
    return activeProjectId ? (tasksCache[activeProjectId] || []) : [];
  }, [tasksCache, activeProjectId]);

  // AUTO-SELECT Project when Persona changes
  useEffect(() => {
    if (activePersonaId && filteredProjects.length > 0) {
      const isCurrentProjectValid = filteredProjects.some(p => p.id === activeProjectId);
      if (!isCurrentProjectValid) {
        setActiveProjectId(filteredProjects[0].id);
        setActiveTaskId(null);
      }
    } else {
      setActiveProjectId(null);
      setActiveTaskId(null);
    }
  }, [activePersonaId, filteredProjects, activeProjectId]);

  useEffect(() => {
    setActiveTaskId(null);
  }, [activeProjectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeProjectId || !activePersonaId) return;

    const message = chatInput.trim();
    setInput("");

    try {
      if (message.toLowerCase().includes("@gemini")) {
         // UI feedback for bot call
         const botCallingMsg: DbActivity = {
           id: "bot-" + Date.now(),
           content: "_OS Brain is thinking..._",
           created_at: new Date().toISOString(),
           visibility: "private",
           event_type: "chat",
           context: { 
             persona_id: activePersonaId, 
             project_id: activeProjectId,
             ...(activeTaskId ? { task_id: activeTaskId } : {})
           }
         };
         
         if (cacheKey) {
           setActivitiesCache(prev => ({
             ...prev,
             [cacheKey]: [...(prev[cacheKey] || []), botCallingMsg]
           }));
         }

         const response = await fetch("/api/chat", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ 
             message: message.replace("@gemini", "").trim(),
             activePersonaId,
             activeProjectId,
             activeTaskId
           }),
         });
         await response.json();
         
         // Remove the thinking indicator. Real messages will sync via the realtime channel.
         if (cacheKey) {
           setActivitiesCache(prev => ({
             ...prev,
             [cacheKey]: (prev[cacheKey] || []).filter(m => m.id !== botCallingMsg.id)
           }));
         }

      } else {
        const contextPayload: any = {
          persona_id: activePersonaId,
          project_id: activeProjectId
        };
        if (activeTaskId) {
          contextPayload.task_id = activeTaskId;
        }

        // V4: Direct Single-Insert with Context via local API
        const apiRes = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            content: message, 
            visibility: 'public',
            event_type: 'chat',
            context: contextPayload
          })
        });
        
        if (!apiRes.ok) {
          throw new Error(await apiRes.text());
        }
      }
    } catch (error) {
      console.error("Error persisting activity:", error);
    }
  };

  const handleToggleFeatured = async (e: React.MouseEvent, project: DbProject) => {
    e.stopPropagation();
    const newFeatured = !project.featured;
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, featured: newFeatured } : p));
    try {
      await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, updates: { featured: newFeatured } })
      });
    } catch (err) {
      console.error("Failed to toggle featured:", err);
      // Revert on failure
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, featured: project.featured } : p));
    }
  };

  const handleSaveEdit = (updatedProject: DbProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
    setEditingProject(null);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectSlug.trim() || !newProjectTitle.trim() || !newProjectStatus.trim() || !activePersonaId) return;

    setCreatingProject(true);
    setProjectError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newProjectSlug.trim(),
          title: newProjectTitle.trim(),
          description: newProjectDesc.trim(),
          status: newProjectStatus.trim(),
          personaId: activePersonaId
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to create project");
      }

      setIsAddProjectOpen(false);
      setNewProjectSlug("");
      setNewProjectTitle("");
      setNewProjectDesc("");
      setNewProjectStatus("exploring");
      
      loadInitialData();
    } catch (err: any) {
      setProjectError(err.message || "An error occurred");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProjectId || !activePersonaId) return;

    setCreatingTask(true);
    setTaskError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          project_id: activeProjectId,
          parent_id: newTaskParentId,
          description: newTaskDesc.trim()
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to create task");
      }

      setIsAddTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskParentId(null);
      
      // Invalidate tasks cache to trigger refetch
      if (activeProjectId) {
        setTasksCache(prev => {
          const next = { ...prev };
          delete next[activeProjectId];
          return next;
        });
      }
    } catch (err: any) {
      setTaskError(err.message || "An error occurred");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update task status");
      
      // Invalidate tasks cache to trigger refetch
      if (activeProjectId) {
        setTasksCache(prev => {
          const next = { ...prev };
          delete next[activeProjectId];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task and all of its subtasks?")) return;
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      setActiveTaskId(null); // Clear context
      
      // Invalidate tasks cache to trigger refetch
      if (activeProjectId) {
        setTasksCache(prev => {
          const next = { ...prev };
          delete next[activeProjectId];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const renderTaskTree = (parentId: string | null): React.ReactNode => {
    const levelTasks = projectTasks.filter(t => t.parent_id === parentId);
    
    if (levelTasks.length === 0) {
      if (parentId === null) {
        return <p className="text-[11px] text-zinc-600 italic pl-2 py-1">No tasks created yet.</p>;
      }
      return null;
    }

    return levelTasks.map((task) => {
      const hasChildren = projectTasks.some(t => t.parent_id === task.id);
      const isCollapsed = !!collapsedTasks[task.id];
      const isTaskSelected = activeTaskId === task.id;

      return (
        <div key={task.id} className="space-y-0.5">
          <div 
            onClick={() => setActiveTaskId(task.id)}
            className={`flex items-center w-full px-2 py-1 rounded text-left group cursor-pointer transition-all ${
              isTaskSelected ? "bg-accent/20 text-white border-l-2 border-accent" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"
            }`}
          >
            <span 
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskCollapse(task.id);
              }}
              className="mr-1 text-zinc-500 hover:text-white cursor-pointer select-none text-[8px]"
            >
              {hasChildren ? (isCollapsed ? "▶" : "▼") : "•"}
            </span>

            <span className="mr-1.5 text-zinc-500 select-none text-xs">
              {hasChildren ? "📁" : "📄"}
            </span>

            <span className="truncate text-[13px] font-medium flex-grow leading-tight">
              {task.title}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewTaskParentId(task.id);
                setIsAddTaskOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-500 hover:text-white transition-opacity cursor-pointer"
              title="Add Subtask"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          {hasChildren && !isCollapsed && (
            <div className="pl-3 border-l border-zinc-700/40 ml-2.5">
              {renderTaskTree(task.id)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleOpenShare = () => {
    if (!activeProjectId) return;
    const currentProj = projects.find(p => p.id === activeProjectId);
    setSharingPersonaIds(currentProj?.relatedPersonas || []);
    setShareError(null);
    setIsShareOpen(true);
  };

  const handleSaveSharing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    setSavingShare(true);
    setShareError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          personaIds: sharingPersonaIds
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to update project sharing");
      }

      setIsShareOpen(false);
      loadInitialData();
    } catch (err: any) {
      setShareError(err.message || "An error occurred");
    } finally {
      setSavingShare(false);
    }
  };

  const handleTogglePersonaShare = (personaId: string) => {
    setSharingPersonaIds(prev => 
      prev.includes(personaId) 
        ? prev.filter(id => id !== personaId) 
        : [...prev, personaId]
    );
  };

  const resetPersonaForm = () => {
    setPersonaFormId("");
    setPersonaFormName("");
    setPersonaFormDesc("");
    setPersonaFormStatus("exploring");
    setPersonaFormVisibility("public");
    setPersonaError(null);
  };

  const handleOpenAddPersona = () => {
    resetPersonaForm();
    setIsAddPersonaOpen(true);
  };

  const handleOpenEditPersona = (persona: DbPersona) => {
    setSelectedPersona(persona);
    setPersonaFormId(persona.id);
    setPersonaFormName(persona.name);
    setPersonaFormDesc(persona.description || "");
    setPersonaFormStatus(persona.status);
    setPersonaFormVisibility(persona.visibility || "public");
    setPersonaError(null);
    setIsEditPersonaOpen(true);
  };

  const handleOpenDeletePersona = (persona: DbPersona) => {
    setSelectedPersona(persona);
    setPersonaError(null);
    setIsDeletePersonaOpen(true);
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaFormId.trim() || !personaFormName.trim() || !personaFormStatus) return;

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(personaFormId)) {
      setPersonaError("ID must be a valid slug (lowercase letters, numbers, and hyphens only).");
      return;
    }

    setSavingPersona(true);
    setPersonaError(null);

    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personaFormId.trim(),
          name: personaFormName.trim(),
          description: personaFormDesc.trim(),
          status: personaFormStatus,
          visibility: personaFormVisibility
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to create persona");
      }

      setIsAddPersonaOpen(false);
      resetPersonaForm();
      setActivePersonaId(resData.data.id);
      loadInitialData();
    } catch (err: any) {
      setPersonaError(err.message || "An error occurred");
    } finally {
      setSavingPersona(false);
    }
  };

  const handleUpdatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaFormId || !personaFormName.trim() || !personaFormStatus) return;

    setSavingPersona(true);
    setPersonaError(null);

    try {
      const res = await fetch("/api/personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personaFormId,
          name: personaFormName.trim(),
          description: personaFormDesc.trim(),
          status: personaFormStatus,
          visibility: personaFormVisibility
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update persona");
      }

      setIsEditPersonaOpen(false);
      setSelectedPersona(null);
      resetPersonaForm();
      loadInitialData();
    } catch (err: any) {
      setPersonaError(err.message || "An error occurred");
    } finally {
      setSavingPersona(false);
    }
  };

  const handleDeletePersona = async () => {
    if (!selectedPersona) return;

    setSavingPersona(true);
    setPersonaError(null);

    try {
      const res = await fetch(`/api/personas?id=${selectedPersona.id}`, {
        method: "DELETE"
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to delete persona");
      }

      setIsDeletePersonaOpen(false);
      
      const remaining = personas.filter(p => p.id !== selectedPersona.id);
      if (activePersonaId === selectedPersona.id) {
        if (remaining.length > 0) {
          setActivePersonaId(remaining[0].id);
        } else {
          setActivePersonaId(null as any);
        }
      }

      setSelectedPersona(null);
      loadInitialData();
    } catch (err: any) {
      setPersonaError(err.message || "An error occurred");
    } finally {
      setSavingPersona(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full bg-[#313338] text-zinc-500 font-mono italic">
       <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="tracking-widest uppercase text-[10px]">Synchronizing Persona_OS v4...</span>
       </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden select-none bg-[#313338] text-zinc-200">
      
      {/* COLUMN 1: Persona Switcher */}
      <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2 overflow-y-auto no-scrollbar border-r border-black/10 h-full flex-shrink-0">
         {personas.map((p) => (
           <button
             key={p.id}
             onClick={() => setActivePersonaId(p.id)}
             title={p.name}
             className={`relative group flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 overflow-hidden ${
               activePersonaId === p.id ? "rounded-[16px] bg-accent text-white" : "bg-[#313338] text-zinc-400 hover:bg-accent hover:text-white"
             }`}
           >
             <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
               activePersonaId === p.id ? "h-10 opacity-100" : "h-2 opacity-0 group-hover:opacity-100 group-hover:h-5"
             }`} />
             <span className="font-bold text-sm uppercase tracking-tighter">{p.name.substring(0, 2)}</span>
           </button>
         ))}

         {/* Add Persona button */}
         <button
           onClick={handleOpenAddPersona}
           title="Add Persona"
           className="relative group flex items-center justify-center w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 overflow-hidden bg-[#2B2D31] text-zinc-500 hover:bg-green-500/20 hover:text-green-500 mt-2 border border-dashed border-zinc-700/60 cursor-pointer"
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
         </button>
      </div>

      {/* COLUMN 2: Project List */}
      <div className="w-60 bg-[#2B2D31] flex flex-col overflow-hidden h-full flex-shrink-0 text-zinc-400">
        <div className="h-12 px-4 flex items-center justify-between border-b border-black/20 shadow-sm font-bold text-white text-sm bg-[#2B2D31]">
           {(() => {
             const activePersona = personas.find(p => p.id === activePersonaId);
             return (
               <>
                 <div className="min-w-0 flex flex-col justify-center">
                   <span className="truncate uppercase tracking-wide text-[11px] opacity-70">
                     {activePersona?.name || "Select Persona"}
                   </span>
                   {activePersona && (
                     <span className="text-[8px] opacity-50 font-mono -mt-0.5 uppercase truncate tracking-tight">
                       {activePersona.status} / {activePersona.visibility || "public"}
                     </span>
                   )}
                 </div>
                 {activePersona && (
                   <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                     {/* Edit Persona */}
                     <button
                       onClick={() => handleOpenEditPersona(activePersona)}
                       title="Edit Persona"
                       className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-[#35373C]"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                     </button>
                     {/* Delete Persona */}
                     <button
                       onClick={() => handleOpenDeletePersona(activePersona)}
                       title="Delete Persona"
                       className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer p-0.5 rounded hover:bg-[#35373C]"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                     </button>
                   </div>
                 )}
               </>
             );
           })()}
        </div>

        <div className="flex-grow overflow-y-auto py-4 px-2 space-y-0.5 no-scrollbar">
           <div className="flex items-center px-2 mb-2 group cursor-default">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Project Channels</span>
              <button 
                onClick={() => setIsAddProjectOpen(true)}
                className="ml-auto text-zinc-500 hover:text-white transition-colors cursor-pointer" 
                title="Add Project"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
           </div>
           
           {filteredProjects.map((proj) => {
             const isSelected = activeProjectId === proj.id;
             return (
               <div key={proj.id} className="space-y-1">
                 <div
                   onClick={() => {
                     setActiveProjectId(proj.id);
                     setActiveTaskId(null);
                   }}
                   className={`flex items-center w-full px-2 py-1.5 rounded group transition-all text-left cursor-pointer ${
                     isSelected && !activeTaskId ? "bg-[#3F4147] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"
                   }`}
                 >
                   <span className="mr-1.5 text-zinc-500 font-medium text-lg leading-none opacity-70">#</span>
                   <span className="truncate text-[15px] font-medium tracking-tight flex-grow">{proj.title}</span>
                   {isSelected && (
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditingProject(proj);
                         }}
                         className="text-zinc-400 hover:text-blue-400 transition-colors p-1 rounded"
                         title="Edit Project"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                       </button>
                       <button
                         onClick={(e) => handleToggleFeatured(e, proj)}
                         className={`transition-colors p-1 rounded ${proj.featured ? 'text-yellow-500' : 'text-zinc-400 hover:text-yellow-500'}`}
                         title={proj.featured ? 'Unfeature' : 'Feature on homepage'}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={proj.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setNewTaskParentId(null);
                           setIsAddTaskOpen(true);
                         }}
                         className="text-zinc-400 hover:text-white transition-opacity p-1 rounded"
                         title="Add Root Task"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                       </button>
                     </div>
                   )}
                 </div>
                 
                 {isSelected && (
                   <div className="pl-4 border-l border-zinc-700/60 ml-3 space-y-1">
                     {renderTaskTree(null)}
                   </div>
                 )}
               </div>
             );
           })}
        </div>

        {/* User Info Bar */}
        <div className="h-14 bg-[#232428] px-2 flex items-center gap-2 mt-auto">
           <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white uppercase">AZ</div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#232428]" />
           </div>
           <div className="flex-grow min-w-0">
              <div className="text-[13px] font-bold text-white leading-tight truncate">Anugrah</div>
              <div className="text-[11px] text-zinc-500 leading-tight truncate uppercase tracking-tighter">Root V4</div>
           </div>
           <div className="flex gap-0.5 text-zinc-400">
             <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></button>
             <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button>
           </div>
        </div>
      </div>

      {/* COLUMN 3: Chat Area */}
      <div className="flex-grow bg-[#313338] flex flex-col overflow-hidden h-full relative">
        <header className="h-12 px-4 flex items-center border-b border-black/20 shadow-sm flex-shrink-0 bg-[#313338] z-10 justify-between">
           <div className="flex items-center min-w-0">
             <span className="text-zinc-500 font-medium text-2xl mr-2 opacity-50">#</span>
             <span className="font-bold text-white mr-4">{activeProjectId || "welcome"}</span>
             {activeTaskId && (
               <>
                 <span className="text-zinc-500 mx-1">/</span>
                 <span className="font-semibold text-accent truncate max-w-[200px]">
                   {projectTasks.find(t => t.id === activeTaskId)?.title || "task"}
                 </span>
                 <span className={`ml-3 text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full ${
                   projectTasks.find(t => t.id === activeTaskId)?.status === 'done' 
                     ? 'bg-green-500/20 text-green-400' 
                     : projectTasks.find(t => t.id === activeTaskId)?.status === 'in_progress'
                     ? 'bg-amber-500/20 text-amber-400'
                     : 'bg-zinc-500/20 text-zinc-400'
                 }`}>
                   {projectTasks.find(t => t.id === activeTaskId)?.status || 'todo'}
                 </span>
               </>
             )}
             <div className="w-[1px] h-6 bg-zinc-700 mx-2" />
             <span className="text-xs text-zinc-400 truncate ml-2 opacity-60 uppercase tracking-tighter hidden sm:inline mr-3">
               V4 Context: {activePersonaId}
             </span>
             {activeProjectId && (
               <button
                 onClick={handleOpenShare}
                 className="text-[11px] bg-[#3F4147] hover:bg-[#4E5058] text-zinc-200 font-bold px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                 title="Share Project"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 Share
               </button>
             )}
           </div>

           {activeTaskId && (
             <div className="flex items-center gap-2">
               {projectTasks.find(t => t.id === activeTaskId)?.status !== 'in_progress' && projectTasks.find(t => t.id === activeTaskId)?.status !== 'done' && (
                 <button 
                   onClick={() => handleUpdateTaskStatus(activeTaskId, 'in_progress')}
                   className="text-[11px] bg-amber-500 hover:bg-amber-600 text-black font-bold px-2 py-0.5 rounded cursor-pointer"
                 >
                   Start
                 </button>
               )}
               {projectTasks.find(t => t.id === activeTaskId)?.status !== 'done' && (
                 <button 
                   onClick={() => handleUpdateTaskStatus(activeTaskId, 'done')}
                   className="text-[11px] bg-green-500 hover:bg-green-600 text-black font-bold px-2 py-0.5 rounded cursor-pointer"
                 >
                   Complete
                 </button>
               )}
               {projectTasks.find(t => t.id === activeTaskId)?.status === 'done' && (
                 <button 
                   onClick={() => handleUpdateTaskStatus(activeTaskId, 'todo')}
                   className="text-[11px] bg-zinc-600 hover:bg-zinc-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer"
                 >
                   Reopen
                 </button>
               )}
               <button 
                 onClick={() => handleDeleteTask(activeTaskId)}
                 className="text-[11px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                 title="Delete Task"
               >
                 Delete
               </button>
             </div>
           )}
        </header>

        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#313338]">
           {filteredMessages.length === 0 ? (
             <div className="flex flex-col h-full items-center justify-center text-center opacity-30 px-10">
                <div className="w-16 h-16 rounded-full bg-[#3F4147] flex items-center justify-center mb-4 text-zinc-300">
                  <span className="text-3xl font-mono">{activeTaskId ? "/" : "#"}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {activeTaskId 
                    ? `Welcome to task: ${projectTasks.find(t => t.id === activeTaskId)?.title || "Task"}` 
                    : `Welcome to #${activeProjectId || "PersonaOS"}`}
                </h3>
                <p className="text-sm italic">
                  {activeTaskId 
                    ? "Ini adalah awal dari aktivitas untuk task ini." 
                    : "Ini adalah awal dari timeline aktivitas untuk project ini."}
                </p>
             </div>
           ) : (
             filteredMessages.map((msg) => {
               const isMe = msg.context?.persona_id === activePersonaId && !msg.context?.is_agent;
               const isAI = msg.context?.is_agent === true && msg.event_type === 'chat';
               const isAgentLog = msg.context?.is_agent === true && msg.event_type === 'agent_log';

               return (
                 <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[75%] gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                       {/* Avatar */}
                       <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm self-end mb-1">
                          {(isAI || isAgentLog) ? "🤖" : (isMe ? "ME" : "OS")}
                       </div>
                       
                       {/* Bubble */}
                       <div className="flex flex-col">
                          <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                            isAI 
                              ? "bg-zinc-800 text-accent border border-accent/20 italic" 
                              : isMe 
                              ? "bg-accent text-white rounded-br-none" 
                              : "bg-[#383A40] text-zinc-200 rounded-bl-none font-mono text-xs"
                          }`}>
                             {msg.content}
                          </div>
                          <span className={`text-[9px] mt-1 text-zinc-500 uppercase font-bold tracking-tighter ${isMe ? "text-right mr-1" : "text-left ml-1"}`}>
                             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </div>
                 </div>
               );
             })
           )}
        </div>

        <div className="px-4 pb-6 pt-2 bg-[#313338] flex-shrink-0">
           <form onSubmit={handleSendMessage} className="bg-[#383A40] rounded-lg px-4 py-3 flex items-center gap-4 shadow-inner">
              <input 
                type="text"
                placeholder={`Message #${activeProjectId || "channel"}`}
                className="flex-grow bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-500 text-[15px]"
                value={chatInput}
                onChange={(e) => setInput(e.target.value)}
                disabled={!activeProjectId}
              />
           </form>
           <div className="mt-1 flex justify-between items-center px-1">
             <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider opacity-60">
                V4 LEDGER: STABLE / MENTION @GEMINI
             </span>
             {activeProjectId && (
               <span className="text-[9px] text-zinc-600 font-mono italic">
                 S_SYNC: ONLINE
               </span>
             )}
           </div>
        </div>
      </div>

      {/* ADD PROJECT MODAL */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#313338] border border-zinc-700/60 rounded-lg w-full max-w-md p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
              Create Project Channel
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              Add a new project channel under the active persona: <span className="text-white font-semibold">{(personas.find(p => p.id === activePersonaId)?.name) || activePersonaId}</span>
            </p>

            <form onSubmit={handleAddProject} className="space-y-4">
              {projectError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
                  {projectError}
                </div>
              )}

              <div>
                <label htmlFor="proj-title" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Project Title</label>
                <input
                  id="proj-title"
                  type="text"
                  placeholder="e.g. My Awesome App"
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                  value={newProjectTitle}
                  onChange={(e) => {
                    setNewProjectTitle(e.target.value);
                    const generatedSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                    setNewProjectSlug(generatedSlug);
                  }}
                  required
                />
              </div>

              <div>
                <label htmlFor="proj-slug" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Channel Slug (ID)</label>
                <input
                  id="proj-slug"
                  type="text"
                  placeholder="e.g. my-awesome-app"
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                  value={newProjectSlug}
                  onChange={(e) => setNewProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                />
              </div>

              <div>
                <label htmlFor="proj-desc" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Description</label>
                <textarea
                  id="proj-desc"
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent resize-none"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="proj-status" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Status</label>
                <select
                  id="proj-status"
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 focus:outline-none focus:border-accent cursor-pointer"
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value)}
                >
                  <option value="exploring">Exploring</option>
                  <option value="building">Building</option>
                  <option value="shipped">Shipped</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddProjectOpen(false);
                    setProjectError(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-5 py-2 bg-accent hover:opacity-90 text-white transition-all text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
                >
                  {creatingProject ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#313338] border border-zinc-700/60 rounded-lg w-full max-w-md p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              {newTaskParentId ? "Create Subtask" : "Create Project Task"}
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              {newTaskParentId ? (
                <>Add a subtask under: <span className="text-white font-semibold">{projectTasks.find(t => t.id === newTaskParentId)?.title}</span></>
              ) : (
                <>Add a top-level folder/task under project: <span className="text-white font-semibold">{projects.find(p => p.id === activeProjectId)?.title}</span></>
              )}
            </p>

            <form onSubmit={handleAddTask} className="space-y-4">
              {taskError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
                  {taskError}
                </div>
              )}

              <div>
                <label htmlFor="task-title" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Task Title</label>
                <input
                  id="task-title"
                  type="text"
                  placeholder="e.g. Design API schemas"
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="task-desc" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea
                  id="task-desc"
                  placeholder="Describe the scope of this task..."
                  rows={3}
                  className="w-full bg-[#1E1F22] border border-black/20 rounded p-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent resize-none"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTaskOpen(false);
                    setNewTaskParentId(null);
                    setTaskError(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2 bg-accent hover:opacity-90 text-white transition-all text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
                >
                  {creatingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE PROJECT MODAL */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-[#313338] border border-zinc-700/60 rounded-lg w-full max-w-sm p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Share Project
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              Select which personas can access the project: <span className="text-white font-semibold">{projects.find(p => p.id === activeProjectId)?.title}</span>
            </p>

            <form onSubmit={handleSaveSharing} className="space-y-4">
              {shareError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
                  {shareError}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {personas.map((persona) => {
                  const isChecked = sharingPersonaIds.includes(persona.id);
                  return (
                    <div 
                      key={persona.id} 
                      onClick={() => handleTogglePersonaShare(persona.id)}
                      className="flex items-center gap-3 p-2.5 rounded bg-[#2B2D31] hover:bg-[#35373C] cursor-pointer transition-colors border border-zinc-700/40"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Controlled by parent div click
                        className="w-4 h-4 rounded text-accent focus:ring-accent border-zinc-600 bg-[#1E1F22] cursor-pointer"
                      />
                      <div className="min-w-0 flex-grow">
                        <div className="text-[13px] font-bold text-white truncate leading-tight">{persona.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate leading-tight uppercase mt-0.5">{persona.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareOpen(false);
                    setShareError(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShare}
                  className="px-5 py-2 bg-accent hover:opacity-90 text-white transition-all text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
                >
                  {savingShare ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADD PERSONA MODAL */}
      {isAddPersonaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#313338] border border-zinc-700/60 rounded-lg w-full max-w-sm p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              Create New Persona
            </h2>
            <p className="text-xs text-zinc-400 mb-6">Define a new administrative profile identity context.</p>

            <form onSubmit={handleCreatePersona} className="space-y-4">
              {personaError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded leading-relaxed">
                  {personaError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Persona ID (Slug)</label>
                <input
                  type="text"
                  placeholder="e.g. cloud-architect"
                  required
                  value={personaFormId}
                  onChange={(e) => setPersonaFormId(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Lowercase, numbers, and hyphens only. Unique.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Architect"
                  required
                  value={personaFormName}
                  onChange={(e) => setPersonaFormName(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Describe this persona role..."
                  value={personaFormDesc}
                  onChange={(e) => setPersonaFormDesc(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm h-20 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
                  <select
                    value={personaFormStatus}
                    onChange={(e) => setPersonaFormStatus(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="active">Active</option>
                    <option value="exploring">Exploring</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Visibility</label>
                  <select
                    value={personaFormVisibility}
                    onChange={(e) => setPersonaFormVisibility(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddPersonaOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPersona}
                  className="px-5 py-2 bg-accent hover:opacity-90 text-white transition-all text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
                >
                  {savingPersona ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERSONA MODAL */}
      {isEditPersonaOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#313338] border border-zinc-700/60 rounded-lg w-full max-w-sm p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1">
              Edit Persona
            </h2>
            <p className="text-xs text-zinc-400 mb-6">Modify details for: <span className="text-white font-semibold">{selectedPersona.name}</span></p>

            <form onSubmit={handleUpdatePersona} className="space-y-4">
              {personaError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded leading-relaxed">
                  {personaError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Persona ID</label>
                <input
                  type="text"
                  disabled
                  value={personaFormId}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-500 text-sm cursor-not-allowed opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={personaFormName}
                  onChange={(e) => setPersonaFormName(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Description</label>
                <textarea
                  value={personaFormDesc}
                  onChange={(e) => setPersonaFormDesc(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm h-20 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
                  <select
                    value={personaFormStatus}
                    onChange={(e) => setPersonaFormStatus(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="active">Active</option>
                    <option value="exploring">Exploring</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Visibility</label>
                  <select
                    value={personaFormVisibility}
                    onChange={(e) => setPersonaFormVisibility(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditPersonaOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPersona}
                  className="px-5 py-2 bg-accent hover:opacity-90 text-white transition-all text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
                >
                  {savingPersona ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PERSONA MODAL */}
      {isDeletePersonaOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#313338] border border-red-500/20 rounded-lg w-full max-w-sm p-6 shadow-2xl text-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Delete Persona?
            </h2>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{selectedPersona.name}"</span>? 
              This will permanently delete all associated project linkages and timeline evolutions. This action cannot be undone.
            </p>

            {personaError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded mb-4">
                {personaError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/60 mt-6">
              <button
                type="button"
                onClick={() => setIsDeletePersonaOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold rounded hover:bg-[#35373C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePersona}
                disabled={savingPersona}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white transition-colors text-sm font-bold rounded shadow-md flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer"
              >
                {savingPersona ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <EditProjectModal 
          project={editingProject} 
          onClose={() => setEditingProject(null)} 
          onSave={handleSaveEdit} 
        />
      )}

    </div>
  );
}
