"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DbConnectedApp } from "@/lib/types";

export default function ConnectedAppsPage() {
  const [apps, setApps] = useState<DbConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch("/api/bridge/apps");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApps(json.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch connected apps:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
    // Auto-refresh every 10 seconds to update live heartbeat status
    const interval = setInterval(fetchApps, 10000);
    return () => clearInterval(interval);
  }, [fetchApps]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (subdomain: string) => {
    if (!confirm(`Are you sure you want to remove '${subdomain}' from registered apps?`)) return;
    setDeletingId(subdomain);
    try {
      const res = await fetch(`/api/bridge/apps?subdomain=${encodeURIComponent(subdomain)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApps(prev => prev.filter(a => a.subdomain !== subdomain));
      }
    } catch (err) {
      console.error("Failed to delete app:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return "Never";
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl p-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-zinc-100 flex items-center gap-3">
            Connected Apps & Bridges
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Cloudflare Edge
            </span>
          </h2>
          <p className="text-zinc-500 text-sm">
            Monitor reverse tunnels bridging local applications (e.g. OpenClaw) directly to anugrahatwork.com.
          </p>
        </div>
        <button
          onClick={fetchApps}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          Refresh
        </button>
      </header>

      {/* Terminal CLI Helper */}
      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-zinc-300 mb-1">Bridge a new application from your terminal:</div>
          <code className="text-xs font-mono text-emerald-400 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800 inline-block">
            plancli bridge start &lt;subdomain&gt; &lt;port&gt; [--type http|rdp|ssh|tcp]
          </code>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          e.g. <span className="text-zinc-400">plancli bridge start rdp 3389 --type rdp</span>
        </div>
      </div>

      {/* Main Table / App List */}
      {loading ? (
        <div className="text-zinc-500 animate-pulse text-sm py-12 text-center">Loading connected apps...</div>
      ) : apps.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-12 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <h3 className="text-base font-semibold text-zinc-200 mb-1">No Connected Apps Online</h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-4">
            Run <span className="font-mono text-zinc-400">plancli bridge start &lt;subdomain&gt; &lt;port&gt;</span> on your machine to expose your local app.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">App / Subdomain</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Local Target</th>
                <th className="px-6 py-4 font-semibold">Public URL</th>
                <th className="px-6 py-4 font-semibold">Last Heartbeat</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {apps.map((app) => {
                const isOnline = app.status === "online";
                return (
                  <tr key={app.id || app.subdomain} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Status Indicator */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          {isOnline && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-zinc-600"}`}></span>
                        </span>
                        <span className={`text-xs font-mono font-medium ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>

                    {/* App / Subdomain */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">{app.name || app.subdomain}</div>
                      <div className="text-xs text-zinc-500 font-mono">{app.subdomain}</div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-6 py-4">
                      {(() => {
                        const t = (app.type || "http").toLowerCase();
                        if (t === "rdp") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              🖥️ RDP
                            </span>
                          );
                        }
                        if (t === "ssh") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              💻 SSH
                            </span>
                          );
                        }
                        if (t === "tcp") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              🗄️ TCP
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            🌐 HTTP
                          </span>
                        );
                      })()}
                    </td>

                    {/* Local Target */}
                    <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                      localhost:{app.local_port}
                    </td>

                    {/* Public URL */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={app.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 truncate max-w-xs"
                        >
                          {app.public_url}
                        </a>
                        <button
                          onClick={() => handleCopy(app.public_url, app.id)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                          title="Copy URL"
                        >
                          {copiedId === app.id ? (
                            <span className="text-emerald-400 text-[10px] font-bold">Copied!</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Last Heartbeat */}
                    <td className="px-6 py-4 text-xs font-mono text-zinc-400">
                      {formatLastSeen(app.last_heartbeat)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={app.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                            isOnline 
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed pointer-events-none"
                          }`}
                        >
                          Launch
                        </a>
                        <button
                          onClick={() => handleDelete(app.subdomain)}
                          disabled={deletingId === app.subdomain}
                          className="text-xs text-zinc-600 hover:text-red-400 p-1.5 rounded hover:bg-zinc-800/80 transition-colors"
                          title="Remove app entry"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
