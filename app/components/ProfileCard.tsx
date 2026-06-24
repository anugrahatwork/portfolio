import { CurrentFocusCard } from "./CurrentFocusCard";

export interface Profile {
  name: string;
  tagline: string;
  now: string;
  current_focus_description: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  status: string;
}

export interface ProfileCardProps {
  profile: Profile;
  personas: Persona[];
  nowElevated?: boolean;
  compact?: boolean;
}

export function ProfileCard({ profile, personas, nowElevated = false, compact = false }: ProfileCardProps) {
  // Map the Supabase current_focus_description back to the structure CurrentFocusCard expects
  const profileForFocus = {
    ...profile,
    currentFocus: {
      description: profile.current_focus_description,
      activePersonas: [] // We don't have this in simple DB schema yet, or it's inferred
    }
  };

  if (compact) {
    return (
      <section className="glass-card p-6 rounded-2xl mb-6 flex flex-col items-center text-center animate-fade-in">
        <img
          src="/profile.png"
          alt="Profile Image"
          className="w-24 h-24 rounded-full mb-4 border-2 border-accent/30 p-1 shadow-md hover:scale-105 transition-transform duration-300"
        />
        <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {profile.name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2 px-2">
          {profile.tagline}
        </p>
        
        <button 
          onClick={() => window.open('https://www.linkedin.com/in/anugrahxyz', '_blank')} 
          className="mt-5 w-full py-2.5 bg-accent text-white font-medium rounded-xl hover:bg-opacity-95 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-sm shadow-sm cursor-pointer"
        >
          Let&apos;s collaborate
        </button>
      </section>
    );
  }

  return (
    <section className="card p-8 mb-8 rounded shadow" style={{backgroundColor: "var(--card-bg)", border: `1px solid var(--card-border)`, boxShadow: `var(--card-shadow)`}}>
      <div className="flex flex-col md:flex-row items-center mb-4">
        <img
          src="/profile.png"
          alt="Profile Image"
          className="w-20 h-20 rounded-full mr-6 border border-gray-300 dark:border-gray-700"
        />
        <div className="flex flex-col md:flex-row items-center justify-between flex-grow w-full">
          <div>
            <h1 className="text-3xl font-semibold mb-0 leading-snug" style={{color: "var(--foreground)"}}>
              {profile.name}
            </h1>
            <p className="text-lg italic leading-relaxed mb-0" style={{color: "var(--foreground)"}}>{profile.tagline}</p>
          </div>
          <button onClick={() => window.open('https://www.linkedin.com/in/anugrahxyz', '_blank')} className="mt-4 md:mt-0 md:ml-4 px-5 py-2 bg-accent text-white rounded hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 whitespace-nowrap w-full md:w-auto max-w-xs">
            Let&apos;s collaborate
          </button>
        </div>
      </div>
      <div
        style={nowElevated ? { borderLeft: `4px solid var(--accent)`, paddingLeft: "1rem", marginBottom: "1.25rem" } : undefined}
        aria-label="Current focus"
      >
        <h2 className="font-semibold mb-2 text-base" style={nowElevated ? { color: "var(--accent)" } : { color: "var(--foreground)" }}>
          Now
        </h2>
        <p style={nowElevated ? { color: "var(--foreground)", fontWeight: "500", fontSize: "0.875rem", lineHeight: "1.5rem" } : { color: "var(--foreground)" }}>
          {profile.now}. A quiet exploration of new ideas and tools.
        </p>
      </div>
      {nowElevated && <CurrentFocusCard profile={profileForFocus} personas={personas} />}
    </section>
  );
}


