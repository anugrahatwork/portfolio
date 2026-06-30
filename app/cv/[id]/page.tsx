import React from "react";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import PrintOnLoad from "./PrintOnLoad";

export default async function PrintableCVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch Persona using Admin SDK
  const personaRef = adminDb.collection("personas").doc(id);
  const personaSnap = await personaRef.get();
  
  if (!personaSnap.exists) {
    notFound();
  }
  const persona = { id: personaSnap.id, ...personaSnap.data() } as any;

  // Fetch Profile (User details)
  const profileSnap = await adminDb.collection("profiles").limit(1).get();
  const profile = profileSnap.empty ? { name: "Anugrah Zeputra", tagline: "" } : profileSnap.docs[0].data();

  // Fetch Latest Experiences
  const expSnap = await adminDb.collection("experiences")
    .where("persona_id", "==", id)
    .get();
    
  let latestExperience = null;
  if (!expSnap.empty) {
    const sorted = expSnap.docs.map(d => d.data()).sort((a: any, b: any) => {
      const timeA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime();
      const timeB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });
    latestExperience = sorted[0];
  }

  // Use PrintOnLoad client component to trigger print safely


  return (
    <main className="bg-white min-h-screen font-sans text-black">
      <div className="print:hidden bg-zinc-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="font-bold">CV Download Service</div>
        <PrintButton />
      </div>

      <div className="max-w-4xl mx-auto p-8 sm:p-12 print:px-12 print:py-16">
        {/* Header Section */}
        <header className="border-b-2 border-zinc-200 pb-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{profile.name}</h1>
          <h2 className="text-xl text-accent font-medium mb-4">{persona.name}</h2>
          
          {persona.contact_information && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {persona.contact_information.email && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Email:</span> {persona.contact_information.email}
                </div>
              )}
              {persona.contact_information.phone && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Phone:</span> {persona.contact_information.phone}
                </div>
              )}
              {persona.contact_information.linkedin && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">LinkedIn:</span> {persona.contact_information.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                </div>
              )}
              {persona.contact_information.website && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Website:</span> {persona.contact_information.website.replace(/^https?:\/\//, '')}
                </div>
              )}
            </div>
          )}
        </header>

        {/* Professional Summary */}
        {(persona.professional_summary || persona.description_of_self) && (
          <section className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-zinc-100 pb-1">Professional Summary</h3>
            <p className="text-sm leading-relaxed text-gray-700">
              {persona.professional_summary || persona.description_of_self}
            </p>
          </section>
        )}

        {/* Experiences */}
        {latestExperience && Array.isArray(latestExperience.content) && (
          <section className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-zinc-100 pb-1">Professional Experience</h3>
            <div className="flex flex-col gap-6">
              {latestExperience.content.map((companyData: any, i: number) => {
                if (typeof companyData === 'string') {
                  return <p key={i} className="text-sm text-gray-700 leading-relaxed">- {companyData}</p>;
                }
                return (
                  <div key={i} className="mb-8 last:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2 break-after-avoid">
                      <h4 className="text-base font-bold text-gray-900">{companyData.company}</h4>
                      {companyData.time && <span className="text-sm font-medium text-gray-600 sm:ml-4">{companyData.time}</span>}
                    </div>
                    {companyData.role && <div className="text-sm font-semibold text-accent mb-3 italic break-after-avoid">{companyData.role}</div>}
                    
                    {companyData.projects?.map((proj: any, j: number) => (
                      <div key={j} className="ml-4 mb-4 last:mb-0">
                        <h5 className="font-semibold text-gray-800 text-sm mb-1 break-after-avoid">{proj.name}</h5>
                        <ul className="list-disc ml-4 text-sm text-gray-700 space-y-1">
                          {proj.descriptions?.map((desc: string, k: number) => (
                            <li key={k} className="leading-relaxed break-inside-avoid">{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
      
      <PrintOnLoad />
    </main>
  );
}
