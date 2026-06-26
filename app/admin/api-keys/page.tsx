"use client";

import React, { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: string;
  name: string;
  truncated: string;
  status: "active" | "revoked";
  created_at: string;
  last_used: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [newlyCreatedKeyName, setNewlyCreatedKeyName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch all API keys
  const fetchKeys = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/auth/api-keys");
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to fetch API keys");
      }
      const json = await res.json();
      if (json.success) {
        setKeys(json.data);
      } else {
        throw new Error(json.error || "Failed to load keys");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while loading API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Handle key creation
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to create API key");
      }

      const json = await res.json();
      if (json.success) {
        setNewlyCreatedKey(json.data.key);
        setNewlyCreatedKeyName(json.data.name);
        setKeyName("");
        fetchKeys();
      } else {
        throw new Error(json.error || "Failed to create key");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not create API key");
    } finally {
      setCreating(false);
    }
  };

  // Handle key revocation (deletion)
  const handleRevokeKey = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/auth/api-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to revoke API key");
      }

      const json = await res.json();
      if (json.success) {
        setShowDeleteConfirm(null);
        fetchKeys();
      } else {
        throw new Error(json.error || "Failed to revoke key");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not revoke API key");
    }
  };

  // Copy raw key to clipboard
  const copyToClipboard = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-grow p-6 sm:p-8 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8 border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          API Key Management
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Your API keys carry full admin privileges. They allow scripts and external applications to query, write, and manage tasks, activities, and projects on your identity ledger. Keep them secure!
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium animate-fade-in flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* API Key Creation Form */}
      <div className="bg-[#2B2D31] rounded-2xl border border-zinc-800 p-6 mb-8 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
          Create New API Key
        </h2>
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            placeholder="Key name (e.g. Developer Local Script)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            disabled={creating}
            className="flex-grow bg-[#1E1F22] border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 placeholder-zinc-550 focus:outline-none focus:border-accent text-sm transition-all"
            required
          />
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
            Create API Key
          </button>
        </form>
      </div>

      {/* Keys List Table */}
      <div className="bg-[#2B2D31] rounded-2xl border border-zinc-800 overflow-hidden shadow-md">
        <div className="px-6 py-4 border-b border-zinc-800 bg-[#2B2D31] flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Active Keys
          </h2>
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-400">
            {keys.length} total
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-zinc-500 font-mono italic">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs uppercase tracking-wider">Fetching keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-zinc-850/50 text-zinc-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <p className="text-sm text-zinc-500 italic">No API keys created yet. Generate one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#232428] text-zinc-450 uppercase text-[10px] font-mono tracking-wider border-b border-zinc-800">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">API Key</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-850/20 text-zinc-300 transition-colors">
                    <td className="px-6 py-4 font-semibold text-sm text-zinc-200">
                      {k.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <span className="bg-zinc-950/60 border border-zinc-800 px-2.5 py-1 rounded-md text-accent">
                        {k.truncated}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold bg-green-950/40 text-green-300 border border-green-500/20">
                        {k.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-450">
                      {formatDate(k.created_at)}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-450">
                      {formatDate(k.last_used)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setShowDeleteConfirm(k.id)}
                        className="text-zinc-650 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Revoke Key"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Key Created (AIStudio style, show once) */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#2B2D31] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-scale-in">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              API Key Created
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Here is your new API key for <strong className="text-zinc-200">"{newlyCreatedKeyName}"</strong>. Please copy it now and store it in a secure location (e.g. environment file). You will not be able to retrieve or see this key again for security reasons.
            </p>

            <div className="bg-[#1E1F22] border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-4 mb-5 font-mono text-sm text-accent select-all overflow-x-auto custom-scrollbar">
              <span className="whitespace-nowrap">{newlyCreatedKey}</span>
              <button
                onClick={copyToClipboard}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold font-sans rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  copySuccess 
                    ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                    : "bg-accent text-white hover:bg-accent/90"
                }`}
              >
                {copySuccess ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Key
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setNewlyCreatedKey(null);
                  setNewlyCreatedKeyName("");
                }}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Close & I've Saved It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revocation Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#2B2D31] border border-zinc-805 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Revoke API Key?
            </h3>
            
            <p className="text-sm text-zinc-350 leading-relaxed mb-6">
              Are you sure you want to revoke this API key? This action is permanent and cannot be undone. Any scripts, agents, or CLI tools using this key will immediately fail to authenticate.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(showDeleteConfirm)}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Yes, Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
