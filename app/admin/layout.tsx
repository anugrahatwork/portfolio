"use client";

import React from "react";
import { Sidebar } from "./components/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#1E1F22] font-sans overflow-hidden">
      {/* Global Admin Navigation (Chat, Roles, Settings) */}
      <Sidebar />
      <main className="flex-grow flex flex-col overflow-y-auto scrollbar-hide bg-[#313338]">
        {children}
      </main>
    </div>
  );
}
