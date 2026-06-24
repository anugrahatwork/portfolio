"use client";

import React from "react";

export default function RoleManagement() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-bold mb-2">Role & Access Management</h2>
        <p className="text-gray-500 italic">Configure system permissions and feature toggles for users.</p>
      </section>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Access Control Under Construction</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Fase 2 akan segera hadir. Anda akan dapat mengatur Toggle Fitur (On/Off) untuk setiap pengguna dan memberikan akses khusus secara dinamis.
        </p>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-xs font-mono">RBAC_ENGINE: INITIALIZING</span>
        </div>
      </div>
    </div>
  );
}
