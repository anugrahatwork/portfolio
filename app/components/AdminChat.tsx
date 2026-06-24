"use client";

import React, { useState, useRef, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { User, onAuthStateChanged } from "firebase/auth";
import { getUserRole } from "../../lib/data-service";
import { Role } from "../../lib/types";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Identity System Online. I am your OS assistant. How can I help you manage your personas or projects today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("guest");

  // Track session and role using Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const dbRole = await getUserRole(currentUser.uid);
          setRole(dbRole);
        } catch {
          setRole("user");
        }
      } else {
        setRole("guest");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSlashCommand = async (cmd: string) => {
    const lowerCmd = cmd.toLowerCase();
    
    if (lowerCmd === "/help") {
      setMessages(prev => [...prev, { role: "system", content: "Local commands: /whoami, /logout, /help.\nNatural language is routed to the OS Brain." }]);
    } else if (lowerCmd === "/whoami") {
      if (user) {
        setMessages(prev => [...prev, { role: "system", content: `Identity: ${user.email}\nRole: ${role.toUpperCase()}\nUUID: ${user.uid}` }]);
      } else {
        setMessages(prev => [...prev, { role: "system", content: "No active session detected." }]);
      }
    } else if (lowerCmd === "/logout") {
      setMessages(prev => [...prev, { role: "system", content: "Terminating session..." }]);
      await auth.signOut();
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      window.location.href = "/";
    } else {
      setMessages(prev => [...prev, { role: "system", content: `Unrecognized local command: ${cmd}` }]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Intercept slash commands
    if (userMessage.startsWith("/")) {
      await handleSlashCommand(userMessage);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Failed to communicate with the OS Brain.");

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { role: "system", content: `ERROR: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 h-[600px] flex flex-col overflow-hidden font-mono">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-accent animate-pulse' : 'bg-green-500'}`}></div>
          <h3 className="text-sm text-zinc-400 uppercase tracking-widest font-bold">PersonaOS Chat</h3>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-accent text-white rounded-br-none' 
                : msg.role === 'system'
                ? 'bg-red-900/20 text-red-400 border border-red-900/50 italic'
                : 'bg-zinc-800 text-zinc-300 rounded-bl-none'
            }`}>
              {msg.role !== 'user' && <span className="text-[10px] block opacity-40 mb-1 uppercase font-bold">{msg.role}</span>}
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-500 p-3 rounded-lg rounded-bl-none text-xs italic">
              Processing command...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-4 pr-12 text-sm text-zinc-300 focus:outline-none focus:border-accent transition-colors placeholder:text-zinc-700"
            placeholder="E.g., 'Update my tagline' or '/help'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1.5 p-1.5 text-zinc-500 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
          </button>
        </div>
        <div className="mt-2 text-[10px] text-zinc-600 flex justify-between uppercase tracking-tighter">
          <span>Encrypted Session</span>
          <span>S-ROLE: {role.toUpperCase()}</span>
        </div>
      </form>
    </div>
  );
}
