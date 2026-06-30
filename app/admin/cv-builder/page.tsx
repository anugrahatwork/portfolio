"use client";

import React, { useState, useEffect } from "react";
import { DbPersona, DbExperience, DbSkill } from "@/lib/types";

export default function CvBuilder() {
  const [personas, setPersonas] = useState<DbPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  
  const [experiences, setExperiences] = useState<DbExperience[]>([]);
  const [skills, setSkills] = useState<DbSkill[]>([]);
  
  const [professionalSummary, setProfessionalSummary] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editExpJson, setEditExpJson] = useState<string>("");
  const [savingExp, setSavingExp] = useState(false);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/personas");
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
        if (data.length > 0) {
          setSelectedPersonaId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch personas", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPersonaId) {
      const p = personas.find(x => x.id === selectedPersonaId);
      if (p) {
        setProfessionalSummary(p.professional_summary || p.description_of_self || "");
      }
      fetchCvData(selectedPersonaId);
    }
  }, [selectedPersonaId, personas]);

  const fetchCvData = async (personaId: string) => {
    try {
      const res = await fetch(`/api/personas/${personaId}/cv-data`);
      if (res.ok) {
        const data = await res.json();
        setExperiences(data.experiences || []);
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error("Failed to fetch CV data", error);
    }
  };

  const handleGenerateCV = async (forceRegenerate = false) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/personas/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: selectedPersonaId, forceRegenerate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExperiences([data.data.experience]); // Replacing list with just the latest for now
        setSkills(data.data.skills.map((s: string) => ({ name: s } as DbSkill)));
        setProfessionalSummary(data.data.professional_summary || "");
        alert("CV generated successfully!");
      } else {
        alert(data.message || data.error || "Failed to generate CV");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating CV.");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditClick = (exp: DbExperience) => {
    setEditingExpId(exp.id);
    setEditExpJson(JSON.stringify(exp.content, null, 2));
  };

  const handleSaveExp = async (expId: string) => {
    setSavingExp(true);
    try {
      const parsedContent = JSON.parse(editExpJson);
      const res = await fetch(`/api/experiences/${expId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsedContent })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExperiences(prev => prev.map(e => e.id === expId ? { ...e, content: parsedContent } : e));
        setEditingExpId(null);
        alert("Experience updated successfully!");
      } else {
        alert(data.error || "Failed to save");
      }
    } catch (e) {
      alert("Invalid JSON format. Please check your syntax.");
    } finally {
      setSavingExp(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading CV Builder...</div>;

  return (
    <div className="flex flex-col gap-8 p-8 text-zinc-200 h-full overflow-y-auto scrollbar-hide">
      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">CV Builder (AI)</h2>
          <p className="text-zinc-400">Automatically summarize recent activities and extract new skills to build your CV experience.</p>
        </div>
        <div>
          <select 
            className="bg-[#1E1F22] border border-zinc-700 rounded p-2 text-zinc-200 focus:outline-none focus:border-accent"
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
          >
            {personas.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </section>

      {selectedPersonaId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COL: Action / Config */}
          <div className="flex flex-col gap-6">
            <div className="bg-accent/5 p-6 rounded-xl border border-accent/20 shadow-lg relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white relative z-10 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                Experience Generator
              </h3>
              <p className="text-sm text-zinc-400 mb-8 relative z-10 max-w-md leading-relaxed">
                Our AI engine will scan all activities you've logged since your last CV update. It will smartly merge your new accomplishments into your existing experience points, and dynamically extract any new skills you've demonstrated.
              </p>
              
              <div className="flex gap-4 relative z-10">
                <button 
                  onClick={() => handleGenerateCV(false)}
                  disabled={generating}
                  className="px-6 py-3 bg-accent hover:opacity-90 text-white rounded font-bold transition-all shadow-md flex-1 disabled:opacity-50 text-center"
                >
                  {generating ? "Generating..." : "Generate from New Activities"}
                </button>
                <button 
                  onClick={() => handleGenerateCV(true)}
                  disabled={generating}
                  className="px-6 py-3 bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 rounded font-bold transition-all disabled:opacity-50 text-sm"
                  title="Force regenerate all activities from scratch"
                >
                  Force All
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COL: Output Preview */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#2B2D31] p-6 rounded-xl border border-zinc-800/80 shadow-lg flex-1">
              <h3 className="text-lg font-bold mb-4 text-white">Generated CV Output</h3>
              
              <div className="mb-6 bg-[#1E1F22] p-4 rounded border border-zinc-700/50">
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-2">Professional Summary</h4>
                <p className="text-sm text-zinc-300">{professionalSummary || <span className="text-zinc-600 italic">No summary set</span>}</p>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-2">Experiences</h4>
                {experiences.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No experiences generated yet.</p>
                ) : (
                  <div className="space-y-4">
                    {experiences.slice(0, 1).map(exp => (
                      <div key={exp.id} className="bg-[#1E1F22] p-4 rounded border border-zinc-700/50">
                        <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
                          <div className="text-xs text-zinc-500">Last Updated: {new Date(exp.created_at).toLocaleString()}</div>
                          {editingExpId !== exp.id && (
                            <button onClick={() => handleEditClick(exp)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300">
                              Edit JSON
                            </button>
                          )}
                        </div>

                        {editingExpId === exp.id ? (
                          <div className="flex flex-col gap-3">
                            <textarea
                              value={editExpJson}
                              onChange={(e) => setEditExpJson(e.target.value)}
                              className="w-full h-96 bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs p-3 rounded focus:outline-none focus:border-accent"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingExpId(null)} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">
                                Cancel
                              </button>
                              <button onClick={() => handleSaveExp(exp.id)} disabled={savingExp} className="px-3 py-1.5 text-xs bg-accent hover:opacity-90 rounded text-white font-bold disabled:opacity-50">
                                {savingExp ? "Saving..." : "Save Changes"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {Array.isArray(exp.content) && exp.content.map((companyData: any, i: number) => {
                          if (typeof companyData === 'string') {
                            return <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-2">- {companyData}</p>;
                          }
                          return (
                            <div key={i} className="mb-4 last:mb-0">
                              <h5 className="font-bold text-accent mb-1">{companyData.company}</h5>
                              {companyData.projects?.map((proj: any, j: number) => (
                                <div key={j} className="ml-4 mb-2 last:mb-0">
                                  <h6 className="font-semibold text-zinc-200 text-sm">- {proj.name}</h6>
                                  <ul className="list-disc ml-6 mt-1 space-y-1">
                                    {proj.descriptions?.map((desc: string, k: number) => (
                                      <li key={k} className="text-xs text-zinc-400 leading-relaxed">{desc}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-400 uppercase mb-2">Extracted Skills</h4>
                {skills.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No skills extracted yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-semibold">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
