"use client";

import React from "react";

export default function Settings() {
  return (
    <div className="flex flex-col gap-8 p-8 text-zinc-200">
      <section>
        <h2 className="text-2xl font-bold mb-2">Core Settings</h2>
        <p className="text-zinc-400 italic">Manage your profile, account data, and system configurations manually.</p>
      </section>

      <div className="bg-[#2B2D31] rounded-xl border border-zinc-800/80 p-12 flex flex-col items-center justify-center text-center shadow-lg">
        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Settings Panel Under Construction</h3>
        <p className="text-zinc-400 max-w-md mx-auto mb-8 text-sm">
          Core settings modifications (such as profiles and timelines) will be available in future releases.
        </p>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-[#1E1F22] text-zinc-500 rounded text-xs font-mono border border-zinc-800">SETTINGS_V4: STABLE</span>
        </div>
      </div>
    </div>
  );
}
