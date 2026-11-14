import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Terminal,
  Cpu,
  User,
} from "lucide-react";

export interface RunItem {
  id: string;
  room_slug: string;
  user: number | null;
  user_username: string | null;
  language: string;
  code_hash: string;
  status: "queued" | "running" | "completed" | "failed" | "timeout" | "oom";
  exit_code: number | null;
  duration_ms: number | null;
  output: string;
  created_at: string;
  updated_at: string;
}

interface RunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSlug: string;
  queryTokens: {
    viewerToken?: string;
    editorToken?: string;
    generalToken?: string;
  };
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export const RunHistoryModal: React.FC<RunHistoryModalProps> = ({
  isOpen,
  onClose,
  roomSlug,
  queryTokens,
  authFetch,
}) => {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchRuns = useCallback(async () => {
    if (!roomSlug) return;
    setLoading(true);
    setError(null);

    const tokenQuery = queryTokens.editorToken
      ? `?editor_token=${encodeURIComponent(queryTokens.editorToken)}`
      : queryTokens.viewerToken
        ? `?viewer_token=${encodeURIComponent(queryTokens.viewerToken)}`
        : queryTokens.generalToken
          ? `?token=${encodeURIComponent(queryTokens.generalToken)}`
          : "";

    try {
      const res = await authFetch(`/api/rooms/${encodeURIComponent(roomSlug)}/runs/${tokenQuery}`);
      if (!res.ok) {
        throw new Error(`Failed to load execution history (${res.status})`);
      }
      const data: RunItem[] = await res.json();
      setRuns(data);
      if (data.length > 0) {
        setSelectedRun((prev) => (prev ? data.find((r) => r.id === prev.id) || data[0] : data[0]));
      } else {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [roomSlug, queryTokens, authFetch]);

  useEffect(() => {
    if (isOpen) {
      fetchRuns();
    }
  }, [isOpen, fetchRuns]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyOutput = () => {
    if (!selectedRun?.output) return;
    navigator.clipboard.writeText(selectedRun.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: RunItem["status"], exitCode: number | null) => {
    switch (status) {
      case "completed":
        return exitCode === 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Success
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Exit {exitCode}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Timeout
          </span>
        );
      case "oom":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> OOM
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Execution History</h2>
              <p className="text-xs text-slate-400">Past sandboxed runs in room #{roomSlug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRuns}
              disabled={loading}
              title="Refresh history"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Runs Sidebar List */}
          <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/40">
            <div className="p-3 border-b border-slate-800/60 text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Runs ({runs.length})</span>
              {loading && <span className="text-blue-400 animate-pulse">Syncing...</span>}
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {runs.length === 0 && !loading && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No executions recorded yet.
                </div>
              )}

              {runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-blue-600/10 border-l-2 border-blue-500 text-white"
                        : "hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                        {r.language}
                      </span>
                      {getStatusBadge(r.status, r.exit_code)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {r.user_username || "Guest"}
                      </span>
                      <span>{formatTimestamp(r.created_at)}</span>
                    </div>
                    {r.duration_ms !== null && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        {r.duration_ms} ms
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Run Detail Output View */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {selectedRun ? (
              <>
                <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">{selectedRun.id}</span>
                        {getStatusBadge(selectedRun.status, selectedRun.exit_code)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                        <span>Language: <strong className="text-slate-200 capitalize">{selectedRun.language}</strong></span>
                        <span>Duration: <strong className="text-slate-200">{selectedRun.duration_ms ? `${selectedRun.duration_ms}ms` : "N/A"}</strong></span>
                        <span>Exit Code: <strong className="text-slate-200">{selectedRun.exit_code !== null ? selectedRun.exit_code : "N/A"}</strong></span>
                      </div>
                    </div>
                  </div>
                  {selectedRun.output && (
                    <button
                      onClick={handleCopyOutput}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy Output"}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 bg-black/40 whitespace-pre-wrap leading-relaxed select-text">
                  {selectedRun.output ? (
                    selectedRun.output
                  ) : (
                    <span className="text-slate-500 italic">No output produced for this execution.</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                <Terminal className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Select a run from the list to view its streamed output.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunHistoryModal;
