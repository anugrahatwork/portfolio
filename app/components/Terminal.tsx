"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth } from "../../lib/firebase";
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { getUserRole } from "../../lib/data-service";
import { Role } from "../../lib/types";

type TerminalState = "idle" | "awaiting_email" | "awaiting_password" | "awaiting_reset_email" | "awaiting_new_password" | "authenticating";
type AuthAction = "login" | "register" | "reset";

const COMMAND_REGISTRY: Record<string, { roles: Role[] }> = {
  login: { roles: ["guest"] },
  register: { roles: ["root"] },
  reset: { roles: ["guest"] },
  logout: { roles: ["user", "root"] },
  clear: { roles: ["guest", "user", "root"] },
  exit: { roles: ["guest", "user", "root"] },
  help: { roles: ["guest", "user", "root"] },
  sudo: { roles: ["user", "root"] },
};

export function Terminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("guest");
  const [history, setHistory] = useState<React.ReactNode[]>([
    "Welcome to PersonaOS Terminal (v1.0.0)",
    "Type 'help' for available commands.",
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<TerminalState>("idle");
  const [authAction, setAuthAction] = useState<AuthAction | null>(null);
  const [email, setEmail] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global backtick listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "`") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auth event listener for recovery and session tracking using Firebase
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const addLine = (line: React.ReactNode) => {
    setHistory((prev) => [...prev, line]);
  };

  const getPromptPrefix = () => {
    if (state !== "idle") return ">";
    if (user) {
      const username = user.email?.split("@")[0] || "user";
      return `[${username}@persona-os${role === "root" ? ":#": ":$"}] >`;
    }
    return "$";
  };

  const handleLogout = async () => {
    setState("authenticating");
    try {
      await auth.signOut();
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      addLine("Logged out successfully. Session terminated.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLine(`Error: ${errorMessage}`);
    } finally {
      setState("idle");
    }
  };

  const handleCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    
    // Don't echo passwords to the history
    if (state !== "awaiting_password" && state !== "awaiting_new_password") {
       const prefix = getPromptPrefix();
       addLine(`${prefix} ${trimmedCmd.toLowerCase()}`);
    }

    if (state === "idle") {
      const lowerCmd = trimmedCmd.toLowerCase();
      
      // RBAC Check
      if (COMMAND_REGISTRY[lowerCmd] && !COMMAND_REGISTRY[lowerCmd].roles.includes(role)) {
        addLine(`Permission denied: command '${lowerCmd}' requires elevated privileges.`);
        setInput("");
        return;
      }

      switch (lowerCmd) {
        case "help":
          const available = Object.keys(COMMAND_REGISTRY).filter(k => COMMAND_REGISTRY[k].roles.includes(role));
          addLine(`Available commands: ${available.join(", ")}`);
          break;
        case "whoami":
          if (user) {
            addLine(`Identity: ${user.email}`);
            addLine(`Role: ${role.toUpperCase()}`);
            addLine(`UUID: ${user.uid}`);
            addLine("Use this UUID in the 'user_roles' table/collection to grant 'root' access.");
          }
          break;
        case "clear":
          setHistory([]);
          break;
        case "exit":
          setIsOpen(false);
          break;
        case "login":
          setAuthAction("login");
          setState("awaiting_email");
          addLine("Email: ");
          break;
        case "register":
          setAuthAction("register");
          setState("awaiting_email");
          addLine("Email: ");
          break;
        case "reset":
          setAuthAction("reset");
          setState("awaiting_reset_email");
          addLine("Enter account email for recovery: ");
          break;
        case "logout":
          await handleLogout();
          break;
        case "sudo":
          if (user) {
            addLine("Acquiring root privileges...");
            try {
              const token = await user.getIdToken();
              const res = await fetch("/api/auth/claim-admin", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              });
              if (res.ok) {
                addLine("Admin access level 'root' successfully granted.");
                setRole("root");
              } else {
                const errData = await res.json();
                addLine(`Error: ${errData.error || "Authorization failed"}`);
              }
            } catch (err: any) {
              addLine(`Error acquiring root: ${err.message}`);
            }
          } else {
            addLine("Error: You must be logged in to use sudo.");
          }
          break;
        default:
          addLine(`Command not found: ${lowerCmd}`);
      }
    } else if (state === "awaiting_email") {
      setEmail(trimmedCmd.toLowerCase());
      setState("awaiting_password");
      addLine("Password: ");
    } else if (state === "awaiting_reset_email") {
      await handleResetRequest(trimmedCmd.toLowerCase());
    } else if (state === "awaiting_password") {
      await handleAuth(trimmedCmd);
    } else if (state === "awaiting_new_password") {
      await handlePasswordUpdate(trimmedCmd);
    }
    
    setInput("");
  };

  const handleResetRequest = async (emailAddr: string) => {
    setState("authenticating");
    try {
      await sendPasswordResetEmail(auth, emailAddr);
      addLine("Recovery transmission sent. Awaiting secure link...");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLine(`Error: ${errorMessage}`);
    } finally {
      setState("idle");
      setAuthAction(null);
    }
  };

  const handlePasswordUpdate = async (newPassword: string) => {
    setState("authenticating");
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        addLine("Security override complete. Password updated.");
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        throw new Error("No active user session detected.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLine(`Error: ${errorMessage}`);
    } finally {
      setState("idle");
    }
  };

  const handleAuth = async (password: string) => {
    setState("authenticating");
    addLine("Authenticating...");

    try {
      if (authAction === "login") {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const token = await credential.user.getIdToken();
        
        addLine("Success: Logged in.");
        
        // Auto-claim admin if it matches the configured admin email
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (email.toLowerCase() === adminEmail?.toLowerCase()) {
          addLine("Verifying administrator credentials...");
          const res = await fetch("/api/auth/claim-admin", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            addLine("Admin access level 'root' successfully granted.");
            setRole("root");
          } else {
            const errData = await res.json();
            addLine(`Admin promotion warning: ${errData.error}`);
          }
        }

        addLine(
          <span>
            Welcome back. <a href="/admin" className="underline text-green-400 hover:text-green-300">Go to Dashboard</a>
          </span>
        );
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const token = await credential.user.getIdToken();
        addLine("Success: Account created.");

        // Auto-claim admin if it matches the configured admin email
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (email.toLowerCase() === adminEmail?.toLowerCase()) {
          addLine("Verifying administrator credentials...");
          const res = await fetch("/api/auth/claim-admin", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            addLine("Admin access level 'root' successfully granted.");
            setRole("root");
          } else {
            const errData = await res.json();
            addLine(`Admin promotion warning: ${errData.error}`);
          }
        }
      }
      if (authAction !== "login") {
         setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLine(`Error: ${errorMessage}`);
    } finally {
      setState("idle");
      setAuthAction(null);
      setEmail("");
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full h-1/2 bg-black text-green-500 font-mono z-[9999] transition-transform duration-300 ${
        isOpen ? "translate-y-0 shadow-2xl" : "-translate-y-full"
      }`}
    >
      <div className="flex flex-col h-full p-4 overflow-hidden border-b border-green-900">
        <div ref={scrollRef} className="flex-grow overflow-y-auto mb-2 scrollbar-hide">
          {history.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap mb-1 leading-relaxed">
              {line}
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <span className="mr-2">{getPromptPrefix()}</span>
          <input
            ref={inputRef}
            type={(state === "awaiting_password" || state === "awaiting_new_password") ? "password" : "text"}
            className="flex-grow bg-transparent border-none outline-none text-green-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommand(input);
            }}
            autoFocus
          />
        </div>
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] text-green-900 opacity-50 uppercase tracking-widest">
        Secret Passage Active
      </div>
    </div>
  );
}
