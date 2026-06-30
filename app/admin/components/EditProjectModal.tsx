"use client";

import React, { useState, useEffect } from "react";
import { DbProject } from "@/lib/types";

interface EditProjectModalProps {
  project: DbProject;
  onClose: () => void;
  onSave: (updatedProject: DbProject) => void;
}

export function EditProjectModal({ project, onClose, onSave }: EditProjectModalProps) {
  const [editingProject, setEditingProject] = useState<DbProject>(project);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if project prop changes unexpectedly (optional)
  useEffect(() => {
    setEditingProject(project);
  }, [project]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { id, ...updates } = editingProject;
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates })
      });
      const json = await res.json();
      if (json.success) {
        onSave(editingProject);
      } else {
        alert("Failed to save project: " + json.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Edit Project</h3>
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Title</label>
            <input 
              type="text" 
              value={editingProject.title || ''} 
              onChange={e => setEditingProject({...editingProject, title: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-accent focus:outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Description</label>
            <textarea 
              value={editingProject.description || ''} 
              onChange={e => setEditingProject({...editingProject, description: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 h-24 focus:border-accent focus:outline-none resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Status</label>
              <select 
                value={editingProject.status} 
                onChange={e => setEditingProject({...editingProject, status: e.target.value as any})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value="exploring">Exploring</option>
                <option value="building">Building</option>
                <option value="shipped">Shipped</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Visibility</label>
              <select 
                value={editingProject.visibility || 'public'} 
                onChange={e => setEditingProject({...editingProject, visibility: e.target.value as any})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">GitHub Link</label>
            <input 
              type="url" 
              value={editingProject.github_link || ''} 
              onChange={e => setEditingProject({...editingProject, github_link: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-accent focus:outline-none"
              placeholder="https://github.com/..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Demo Link</label>
            <input 
              type="url" 
              value={editingProject.demo_link || ''} 
              onChange={e => setEditingProject({...editingProject, demo_link: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200 focus:border-accent focus:outline-none"
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
