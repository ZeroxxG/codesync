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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Exit 0
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Exit {exitCode}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Timeout
          </span>
        );
      case "oom":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> OOM
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
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
      <div className="relative w-full max-w-5xl h-[85vh] bg-vscode-sidebar border border-vscode-border rounded shadow-2xl flex flex-col overflow-hidden text-vscode-text font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-vscode-border bg-vscode-toolbar">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-[#007acc]" />
            <div>
              <h2 className="text-sm font-semibold text-vscode-text">
                Execution History &bull; <span className="font-mono text-xs text-vscode-muted">#{roomSlug}</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchRuns}
              disabled={loading}
              title="Refresh history"
              className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Runs Sidebar List */}
          <div className="w-72 border-r border-vscode-border flex flex-col bg-vscode-sidebar">
            <div className="px-3 py-2 border-b border-vscode-border text-[11px] font-semibold text-vscode-muted uppercase tracking-wider flex items-center justify-between">
              <span>Runs ({runs.length})</span>
              {loading && <span className="text-[#007acc] animate-pulse normal-case font-normal font-sans">Syncing...</span>}
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-vscode-border">
              {runs.length === 0 && !loading && (
                <div className="p-8 text-center text-vscode-muted text-xs">
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
                    className={`w-full text-left p-3 transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? "bg-vscode-active border-l-2 border-[#007acc] text-vscode-text"
                        : "hover:bg-vscode-hover text-vscode-text"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-vscode-input text-vscode-text border border-vscode-border">
                        {r.language}
                      </span>
                      {getStatusBadge(r.status, r.exit_code)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-vscode-muted">
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <User className="w-3 h-3 text-vscode-muted" />
                        {r.user_username || "Guest"}
                      </span>
                      <span className="font-mono text-[10px]">{formatTimestamp(r.created_at)}</span>
                    </div>
                    {r.duration_ms !== null && (
                      <div className="text-[10px] font-mono text-vscode-muted flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" />
                        {r.duration_ms}ms
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Run Detail Output View */}
          <div className="flex-1 flex flex-col bg-vscode-panel overflow-hidden">
            {selectedRun ? (
              <>
                <div className="px-4 py-2.5 border-b border-vscode-border bg-vscode-toolbar flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-vscode-muted">{selectedRun.id}</span>
                        {getStatusBadge(selectedRun.status, selectedRun.exit_code)}
                      </div>
                      <div className="text-[11px] text-vscode-muted mt-0.5 flex items-center gap-3 font-mono">
                        <span>Language: <strong className="text-vscode-text capitalize font-sans">{selectedRun.language}</strong></span>
                        <span>Duration: <strong className="text-vscode-text">{selectedRun.duration_ms ? `${selectedRun.duration_ms}ms` : "N/A"}</strong></span>
                        <span>Exit Code: <strong className="text-vscode-text">{selectedRun.exit_code !== null ? selectedRun.exit_code : "N/A"}</strong></span>
                      </div>
                    </div>
                  </div>
                  {selectedRun.output && (
                    <button
                      onClick={handleCopyOutput}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-vscode-hover hover:bg-vscode-hover/80 text-vscode-text border border-vscode-border transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy Output"}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-vscode-text bg-vscode-panel whitespace-pre-wrap leading-relaxed select-text">
                  {selectedRun.output ? (
                    selectedRun.output
                  ) : (
                    <span className="text-vscode-muted italic">No output produced for this execution.</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-vscode-muted p-8">
                <Terminal className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-xs">Select a run from the list to view its streamed output.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-vscode-border bg-vscode-toolbar flex items-center justify-between text-xs text-vscode-muted">
          <span>Press <kbd className="px-1.5 py-0.5 bg-vscode-input border border-vscode-border rounded text-vscode-text font-mono text-[10px]">Esc</kbd> to close</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-vscode-hover hover:bg-vscode-hover/80 text-vscode-text border border-vscode-border text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunHistoryModal;
