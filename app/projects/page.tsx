"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { getProjects } from "@/lib/data-service";
import { ProjectCard } from "@/app/components/ProjectCard";
import { DbProject } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    async function loadProjects() {
      try {
        const fetchedProjects = await getProjects();
        // Sort by featured then by date descending
        fetchedProjects.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const visibleProjects = projects.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-8 font-sans">
        <p className="text-gray-500 font-mono animate-pulse">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-8 font-sans">
      <main className="max-w-6xl mx-auto flex flex-col gap-8" role="main">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Projects</h1>
            <p className="text-sm text-zinc-500 mt-1">A complete ledger of my work and explorations.</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono">
            ← Back to Home
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12 italic">No projects found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {visibleProjects.map((project) => (
                <ProjectCard key={project.id} project={project as any} />
              ))}
            </div>

            {visibleCount < projects.length && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition-all duration-300 shadow-md cursor-pointer"
                >
                  Load More Projects
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
