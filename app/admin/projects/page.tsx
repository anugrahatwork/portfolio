"use client";

import React, { useState, useEffect } from "react";
import { DbProject } from "@/lib/types";
import { EditProjectModal } from "../components/EditProjectModal";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<DbProject | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio/projects");
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleToggleFeatured = async (project: DbProject) => {
    const newFeatured = !project.featured;
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, featured: newFeatured } : p));
    try {
      await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, updates: { featured: newFeatured } })
      });
    } catch (e) {
      console.error("Failed to toggle featured:", e);
      // Revert on failure
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, featured: project.featured } : p));
    }
  };

  const handleSaveEdit = (updatedProject: DbProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingProject(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-zinc-100">Project Management</h2>
          <p className="text-zinc-500 text-sm">Manage portfolio projects and feature them on the homepage.</p>
        </div>
        <button 
          onClick={fetchProjects}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded transition-colors"
        >
          Refresh Data
        </button>
      </header>

      {loading ? (
        <div className="text-zinc-500 animate-pulse text-sm">Loading projects...</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Project</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Featured</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-200">{project.title}</div>
                    <div className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{project.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
                      project.status === 'shipped' ? 'bg-green-500/10 text-green-400' :
                      project.status === 'building' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleToggleFeatured(project)}
                      className={`transition-colors p-1 rounded-full ${project.featured ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}
                      title={project.featured ? 'Unfeature' : 'Feature on homepage'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={project.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingProject(project)}
                      className="text-accent hover:text-blue-400 font-mono text-xs underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">No projects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
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
