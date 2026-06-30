"use client";

import React, { useState, useEffect } from "react";
import { DbPersona, DbContactInfo, DbCertification } from "@/lib/types";

export default function Settings() {
  const [personas, setPersonas] = useState<DbPersona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  
  const [contactInfo, setContactInfo] = useState<DbContactInfo>({});
  const [goal, setGoal] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [certifications, setCertifications] = useState<DbCertification[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const persona = personas.find(p => p.id === selectedPersonaId);
      if (persona) {
        setContactInfo(persona.contact_information || {});
        setGoal(persona.goal || "");
        setDescription(persona.description_of_self || "");
        setCertifications(persona.certifications || []);
      }
    }
  }, [selectedPersonaId, personas]);

  const handleSaveContactInfo = async () => {
    setSaving(true);
    try {
      const updates = {
        contact_information: contactInfo,
        goal,
        description_of_self: description,
        certifications
      };
      
      const res = await fetch("/api/personas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPersonaId, updates })
      });
      if (res.ok) {
        alert("Saved successfully!");
      } else {
        alert("Failed to save.");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving.");
    } finally {
      setSaving(false);
    }
  };

  const addCertification = () => {
    setCertifications([...certifications, { name: "", type: "external" }]);
  };

  const updateCertification = (index: number, field: string, value: string) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    setCertifications(updated);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading Settings...</div>;

  return (
    <div className="flex flex-col gap-8 p-8 text-zinc-200 max-w-4xl">
      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Persona Settings</h2>
          <p className="text-zinc-400">Manage persona-specific branding and contact information.</p>
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
        <div className="flex flex-col gap-6">
          {/* Contact Info */}
          <div className="bg-[#2B2D31] p-6 rounded-xl border border-zinc-800/80 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-white">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email</label>
                <input type="text" value={contactInfo.email || ""} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-sm focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">LinkedIn</label>
                <input type="text" value={contactInfo.linkedin || ""} onChange={e => setContactInfo({...contactInfo, linkedin: e.target.value})} className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-sm focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Website</label>
                <input type="text" value={contactInfo.website || ""} onChange={e => setContactInfo({...contactInfo, website: e.target.value})} className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-sm focus:border-accent" />
              </div>
            </div>
          </div>

          {/* Goal & Description */}
          <div className="bg-[#2B2D31] p-6 rounded-xl border border-zinc-800/80 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-white">Summary & Branding</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Goal</label>
                <input type="text" value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-[#1E1F22] border border-zinc-700 rounded p-2 text-sm focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Description of Self</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-24 resize-none bg-[#1E1F22] border border-zinc-700 rounded p-2 text-sm focus:border-accent" />
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-[#2B2D31] p-6 rounded-xl border border-zinc-800/80 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-white">Certifications</h3>
            <div className="space-y-4">
              {certifications.map((cert, index) => (
                <div key={index} className="flex gap-2 items-center bg-[#1E1F22] p-3 rounded border border-zinc-700">
                  <input 
                    type="text" 
                    placeholder="Certification Name"
                    value={cert.name} 
                    onChange={(e) => updateCertification(index, "name", e.target.value)}
                    className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                  />
                  <select 
                    value={cert.type}
                    onChange={(e) => updateCertification(index, "type", e.target.value as any)}
                    className="bg-[#2B2D31] border border-zinc-700 rounded p-1 text-xs"
                  >
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                  <button onClick={() => removeCertification(index)} className="text-red-400 hover:text-red-300 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ))}
              <button onClick={addCertification} className="text-xs text-accent hover:underline font-bold">+ Add Certification</button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={handleSaveContactInfo}
              disabled={saving}
              className="px-6 py-2 bg-accent hover:opacity-90 text-white rounded font-bold transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Manual Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
