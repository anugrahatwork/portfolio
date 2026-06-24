"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function SidebarItem({ href, icon, label, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center w-20 py-3 transition-colors group ${
        active 
          ? "bg-accent/10 text-accent border-r-2 border-accent" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
      }`}
    >
      <div className={`mb-1 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter text-center">
        {label}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="w-24 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-6 h-screen sticky top-0">
      {/* Logo / Home */}
      <div className="mb-10 text-accent font-black text-2xl tracking-tighter">
        P.OS
      </div>

      <nav className="flex flex-col flex-grow items-center gap-2 w-full">
        <SidebarItem
          href="/admin/chat"
          label="Chat"
          active={pathname === "/admin/chat"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          }
        />
        <SidebarItem
          href="/admin/roles"
          label="Roles"
          active={pathname === "/admin/roles"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          }
        />
        <SidebarItem
          href="/admin/settings"
          label="Settings"
          active={pathname === "/admin/settings"}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        />
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto flex flex-col items-center gap-4 w-full">
        <Link 
          href="/" 
          className="text-zinc-500 hover:text-white transition-colors"
          title="Back to Site"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </Link>
        <button
          onClick={handleLogout}
          className="text-zinc-600 hover:text-red-500 transition-colors py-2"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
