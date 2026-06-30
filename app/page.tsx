"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { getProfile, getPersonas, getProjects } from "../lib/data-service";

import { ProfileCard } from "./components/ProfileCard";
import { PersonaCard } from "./components/PersonaCard";
import { ProjectCard } from "./components/ProjectCard";
import { ActivityFeed } from "./components/ActivityFeed";
import { LearningLog } from "./components/LearningLog";
import { PersonaEvolution } from "./components/PersonaEvolution";

import { DbProfile, DbPersona, DbProject, DbActivity } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [data, setData] = useState<{
    profile: DbProfile;
    personas: DbPersona[];
    projects: (DbProject & { relatedPersonas: string[] })[];
  } | null>(null);

  const [allActivities, setAllActivities] = useState<DbActivity[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Derive current activities in the selected scope
  const currentActivities = useMemo(() => {
    let filtered = [...allActivities];
    
    if (selectedTaskId) {
      filtered = filtered.filter(a => a.context?.task_id === selectedTaskId);
    } else if (selectedProject) {
      filtered = filtered.filter(a => a.context?.project_id === selectedProject && !a.context?.task_id);
    } else if (selectedPersona) {
      filtered = filtered.filter(a => a.context?.persona_id === selectedPersona);
    }
    
    return filtered;
  }, [allActivities, selectedTaskId, selectedProject, selectedPersona]);

  // Derive tasks for the selected project, sorted descending (latest first)
  const sortedProjectTasks = useMemo(() => {
    const tasks = selectedProject ? allTasks.filter(t => t.project_id === selectedProject) : [];
    return [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allTasks, selectedProject]);

  // Initial load & Auth Listener
  useEffect(() => {
    async function loadData() {
      try {
        const [profile, personas, projects] = await Promise.all([
          getProfile(),
          getPersonas(),
          getProjects()
        ]);
        
        setData({ profile, personas, projects });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Listen to Auth State changes in Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        try {
          const token = await user.getIdToken();
          document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`;
        } catch (e) {
          console.error("Error setting ID token cookie:", e);
        }
      } else {
        setIsLoggedIn(false);
        document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Real-time synchronization for all activities globally
  useEffect(() => {
    const q = query(collection(db, "activities"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activities = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
        } as DbActivity;
      });

      // Sort by created_at descending (latest first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllActivities(activities);
    }, (error) => {
      console.error("Firestore onSnapshot error for activities:", error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization for all tasks globally
  useEffect(() => {
    const q = query(collection(db, "tasks"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : (data.created_at || new Date().toISOString())
        };
      });

      // Sort by created_at ascending (oldest first for rendering, but we will find latest in array)
      tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setAllTasks(tasks);
    }, (error) => {
      console.error("Firestore onSnapshot error for tasks:", error);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-8 font-sans">
        <p className="text-gray-500 font-mono animate-pulse">Loading identity ledger...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-8 font-sans">
        <p className="text-red-500">Failed to load data. Please check your Firebase configuration.</p>
      </div>
    );
  }

  const { personas, projects } = data;
  const activePersonaObj = selectedPersona ? personas.find(p => p.id === selectedPersona) : null;

  // Derive projects with dynamic focus and tags from activities
  const derivedProjects = data.projects.map(project => {
    const projActivities = allActivities.filter(a => a.context?.project_id === project.id);
    let current_focus: string | null = null;
    let tags: string[] = [];

    if (projActivities.length > 0) {
      const latestActivity = projActivities[0];
      current_focus = latestActivity.content;
      if (latestActivity.tags && latestActivity.tags.length > 0) {
        tags = latestActivity.tags;
      } else {
        tags = ['Logs'];
      }
    }

    return {
      ...project,
      current_focus,
      tags
    };
  });

  // Filter projects based on selected persona
  const filteredProjects = selectedPersona
    ? derivedProjects.filter((p) => p.relatedPersonas.includes(selectedPersona))
    : derivedProjects;

  // Sort and limit featured projects for the homepage
  const homepageProjects = [...filteredProjects]
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 4);

  // Derive dynamic profile from latest task and activity streams
  const dynamicProfile: DbProfile = {
    ...data.profile,
    now: data.profile.now,
    current_focus_description: data.profile.current_focus_description
  };

  if (allTasks.length > 0) {
    const latestTask = allTasks[allTasks.length - 1];
    const parentProject = projects.find(p => p.id === latestTask.project_id);
    if (parentProject) {
      dynamicProfile.now = `${latestTask.title} at ${parentProject.title}`;
    } else {
      dynamicProfile.now = latestTask.title;
    }
  }

  if (allActivities.length > 0) {
    dynamicProfile.current_focus_description = allActivities[0].content;
  }

  const handleLogout = async () => {
    await auth.signOut();
    window.location.reload();
  };

  const handlePersonaClick = (id: string) => {
    setSelectedPersona(id === selectedPersona ? null : id);
    setSelectedProject(null);
    setSelectedTaskId(null);
  };

  const handleProjectClick = (id: string) => {
    setSelectedProject(id === selectedProject ? null : id);
    setSelectedTaskId(null);
  };


  // Derive Learning Logs from activities in the current scope
  const learningLogs = currentActivities
    .filter((a: DbActivity) => a.event_type === 'learning_reflection')
    .map((a: DbActivity) => ({
      id: a.id,
      content: a.content,
      created_at: a.created_at,
      inspiredByPersona: a.context?.persona_id ? [a.context.persona_id] : [],
      linkedProjects: a.context?.project_id ? [a.context.project_id] : []
    }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-8 font-sans">
      <main className="max-w-6xl mx-auto flex flex-col gap-6" role="main">
        {isLoggedIn && (
          <div className="flex justify-end mb-[-1rem] relative z-10 gap-4">
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
              welcome back, root. 
              <a href="/admin" className="underline hover:text-accent ml-2 text-zinc-500">access dashboard</a>
              <button onClick={handleLogout} className="underline hover:text-red-500 ml-4 text-zinc-500 cursor-pointer">logout</button>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full">
          {/* Left Sidebar - Profile & Desktop Persona Navigation */}
          <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8 self-start w-full">
            <ProfileCard profile={dynamicProfile!} personas={personas} compact={true} />
            
            {/* Desktop Persona Channel Navigation */}
            <div className="hidden lg:flex flex-col gap-4 glass-card p-6 rounded-2xl">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-450 dark:text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
                Personas
              </h3>
              <div className="flex flex-col gap-1.5 w-full">
                {personas.map((persona) => {
                  const isSelected = persona.id === selectedPersona;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => handlePersonaClick(persona.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? "bg-accent text-white shadow-md shadow-accent/20"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-base font-mono ${isSelected ? 'text-white/80' : 'text-accent'}`}>#</span>
                        <span className="font-semibold text-sm">{persona.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono capitalize ${
                        isSelected 
                          ? "bg-white/20 text-white" 
                          : persona.status === 'active' 
                            ? "bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-300" 
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}>
                        {persona.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Information */}
            {(activePersonaObj?.contact_information?.email || activePersonaObj?.contact_information?.linkedin || activePersonaObj?.contact_information?.phone) && (
              <div className="hidden lg:flex flex-col gap-4 glass-card p-6 rounded-2xl">
                <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-450 dark:text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  Contact
                </h3>
                <div className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {activePersonaObj.contact_information.email && (
                    <a href={`mailto:${activePersonaObj.contact_information.email}`} className="flex items-center gap-3 hover:text-accent transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      {activePersonaObj.contact_information.email}
                    </a>
                  )}
                  {activePersonaObj.contact_information.linkedin && (
                    <a href={activePersonaObj.contact_information.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                      LinkedIn Profile
                    </a>
                  )}
                  {activePersonaObj.contact_information.phone && (
                    <a href={`tel:${activePersonaObj.contact_information.phone}`} className="flex items-center gap-3 hover:text-accent transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {activePersonaObj.contact_information.phone}
                    </a>
                  )}
                  {activePersonaObj.contact_information.website && (
                    <a href={activePersonaObj.contact_information.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                      Portfolio / Web
                    </a>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8 w-full">
            {/* Mobile/Tablet Persona Navigation */}
            <nav
              className="flex lg:hidden gap-3 overflow-x-auto pb-2 scrollbar-hide w-full"
              aria-label="Personas navigation"
              role="list"
            >
              {personas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  selected={persona.id === selectedPersona}
                  onClick={handlePersonaClick}
                />
              ))}
            </nav>

            {/* Active Focus Card */}
            <div className="glass-card p-6 rounded-2xl animate-fade-in flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Active Focus
                  </h2>
                </div>
                <span className="text-[10px] text-accent bg-accent/10 px-2.5 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider animate-pulse">
                  Live Status
                </span>
              </div>
              
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-850 dark:text-gray-200 leading-relaxed">
                  {dynamicProfile!.now}
                </p>
                {dynamicProfile!.current_focus_description && (
                  <p className="text-xs text-gray-550 dark:text-gray-400 italic font-mono pl-3 border-l-2 border-accent/40 py-0.5 mt-1">
                    {dynamicProfile!.current_focus_description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100/50 dark:border-zinc-800/50">
                {personas.map((p) => {
                  const isSelected = p.id === selectedPersona;
                  return (
                    <span
                      key={p.id}
                      onClick={() => handlePersonaClick(p.id)}
                      className={`text-xs px-3 py-1 rounded-full font-medium cursor-pointer transition-all duration-150 ${
                        isSelected 
                          ? "bg-accent text-white shadow-sm" 
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-350 border border-zinc-200/30 dark:border-zinc-800/30"
                      }`}
                    >
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Persona Contact & CV Section */}
            {activePersonaObj && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Contact & CV Button */}
                <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Contact & Resume
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {activePersonaObj.contact_information?.email && (
                      <a href={`mailto:${activePersonaObj.contact_information.email}`} className="hover:text-accent transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/></svg>
                        {activePersonaObj.contact_information.email}
                      </a>
                    )}
                    {activePersonaObj.contact_information?.linkedin && (
                      <a href={activePersonaObj.contact_information.linkedin} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                        LinkedIn
                      </a>
                    )}
                    {activePersonaObj.contact_information?.website && (
                      <a href={activePersonaObj.contact_information.website} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                        Website
                      </a>
                    )}
                    {!activePersonaObj.contact_information?.email && !activePersonaObj.contact_information?.linkedin && !activePersonaObj.contact_information?.website && (
                      <span className="italic text-xs">No contact info available.</span>
                    )}
                  </div>
                </div>
                <Link 
                  href={`/cv/${activePersonaObj.id}`}
                  target="_blank"
                  className="shrink-0 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:opacity-90 rounded-lg text-sm font-bold flex items-center gap-2 transition-opacity cursor-pointer shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Download CV
                </Link>
              </div>
              </div>
            )}

            {/* Projects Section */}
            <section aria-labelledby="projects-heading" role="region" className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2
                  id="projects-heading"
                  className="text-lg font-bold text-gray-900 dark:text-gray-100"
                >
                  Projects
                </h2>
                {selectedPersona && (
                  <span className="text-xs text-zinc-450 dark:text-zinc-500 font-mono">
                    Filtered by Persona
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {homepageProjects.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 col-span-2 py-6 italic">No projects to show.</p>
                ) : (
                  homepageProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      selected={project.id === selectedProject}
                      onClick={handleProjectClick}
                    />
                  ))
                )}
              </div>
              {filteredProjects.length > 4 && (
                <div className="mt-2 flex justify-center">
                  <Link
                    href="/projects"
                    className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.5)] cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover, #2563eb) 100%)"
                    }}
                  >
                    View All Projects <span className="ml-2">➔</span>
                  </Link>
                </div>
              )}
            </section>

            {/* Tasks Ledger Section */}
            {selectedProject && (
              <section className="glass-card p-6 rounded-2xl transition-all">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Tasks Ledger: {projects.find(p => p.id === selectedProject)?.title}</span>
                  </h2>
                  {selectedTaskId && (
                    <button
                      onClick={() => setSelectedTaskId(null)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono cursor-pointer"
                    >
                      Clear Task Filter
                    </button>
                  )}
                </div>
                
                {sortedProjectTasks.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-650 py-6 italic select-none">
                    No tasks to show.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedProjectTasks.slice(0, 10).map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-accent/10 border-accent/60 dark:bg-accent/5"
                              : "bg-white/50 border-zinc-200/60 hover:bg-zinc-100/50 dark:bg-zinc-900/40 dark:border-zinc-800/80 dark:hover:bg-zinc-850/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                task.status === "done"
                                  ? "bg-green-500"
                                  : task.status === "in_progress"
                                  ? "bg-blue-500 animate-pulse"
                                  : "bg-zinc-400 dark:bg-zinc-550"
                              }`}
                            />
                            <span
                              className={`text-sm font-medium truncate ${
                                isSelected
                                  ? "text-accent dark:text-blue-400 font-bold"
                                  : "text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold ${
                              task.status === "done"
                                ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                                : task.status === "in_progress"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {task.status === "in_progress" ? "in progress" : task.status}
                          </span>
                        </div>
                      );
                    })}

                    {sortedProjectTasks.length > 10 && (
                      <div className="text-center text-xs text-zinc-600 dark:text-zinc-350 font-mono py-2 italic border-t border-zinc-100/50 dark:border-zinc-800/50 mt-1 select-none">
                        many more
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Timelines and Ledger Feed */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Timeline Ledger</span>
                  </h2>
                  {(selectedProject || selectedTaskId || selectedPersona) && (
                    <button 
                      onClick={() => {
                        setSelectedProject(null);
                        setSelectedTaskId(null);
                        setSelectedPersona(null);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
                
                {currentActivities.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-650 py-6 italic select-none">No activities to show.</p>
                ) : (
                  <ActivityFeed activities={currentActivities.slice(0, 5)} />
                )}
              </div>

              {learningLogs.length > 0 && (
                <LearningLog learningLogs={learningLogs} personas={personas} projects={projects}/>
              )}

              {selectedPersona && (
                <article tabIndex={-1} aria-label="Persona evolution history">
                  <PersonaEvolution persona={personas.find(p => p.id === selectedPersona)!} />
                </article>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
