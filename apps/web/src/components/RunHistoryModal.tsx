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

const badge = "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]";

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
          <span className={`${badge} border-emerald-500/25 bg-emerald-500/10 text-emerald-400`}>
            <CheckCircle2 className="w-3 h-3" /> ok
          </span>
        ) : (
          <span className={`${badge} border-rose-500/25 bg-rose-500/10 text-rose-400`}>
            <XCircle className="w-3 h-3" /> {exitCode}
          </span>
        );
      case "failed":
        return (
          <span className={`${badge} border-rose-500/25 bg-rose-500/10 text-rose-400`}>
            <XCircle className="w-3 h-3" /> fail
          </span>
        );
      case "timeout":
        return (
          <span className={`${badge} border-amber-500/25 bg-amber-500/10 text-amber-400`}>
            <Clock className="w-3 h-3" /> time
          </span>
        );
      case "oom":
        return (
          <span className={`${badge} border-purple-500/25 bg-purple-500/10 text-purple-400`}>
            <AlertTriangle className="w-3 h-3" /> oom
          </span>
        );
      case "running":
        return (
          <span className={`${badge} border-accent/25 bg-accent/10 text-accentText`}>
            <RotateCw className="w-3 h-3 animate-spin" /> run
          </span>
        );
      case "queued":
        return (
          <span className={`${badge} border-amber-500/25 bg-amber-500/10 text-amber-400`}>
            <Clock className="w-3 h-3" /> queued
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-shell flex h-[85vh] max-w-5xl flex-col">
        {/* Header */}
        <div className="modal-head shrink-0">
          <div className="flex items-center gap-3">
            <div className="icon-tile h-9 w-9">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-fg">Run history</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                #{roomSlug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchRuns}
              disabled={loading}
              title="Refresh history"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Runs Sidebar List */}
          <div className="flex w-64 shrink-0 flex-col border-r border-line bg-canvas sm:w-72">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <span>Runs ({runs.length})</span>
              {loading && <span className="text-accentText">syncing</span>}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 border-b border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {runs.length === 0 && !loading && (
                <div className="p-6 text-center text-[11px] text-muted">
                  <Terminal className="mx-auto mb-2 h-7 w-7 opacity-40" />
                  No executions recorded yet.
                </div>
              )}

              {runs.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`flex w-full flex-col gap-1.5 border-b border-line/60 px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-l-2 border-l-accent bg-accent/[0.06] text-fg"
                        : "text-muted hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-fg">
                        {r.language}
                      </span>
                      {getStatusBadge(r.status, r.exit_code)}
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {r.user_username || "guest"}
                      </span>
                      <span>{formatTimestamp(r.created_at)}</span>
                    </div>
                    {r.duration_ms !== null && (
                      <div className="flex items-center gap-1 font-mono text-[9px] text-muted/80">
                        <Cpu className="h-2.5 w-2.5" />
                        {r.duration_ms} ms
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Run Detail Output View */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-night">
            {selectedRun ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nightLine bg-nightRaised px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-[10px] text-nightMuted">
                        {selectedRun.id}
                      </span>
                      {getStatusBadge(selectedRun.status, selectedRun.exit_code)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-nightMuted">
                      <span>
                        lang <strong className="font-semibold text-nightFg">{selectedRun.language}</strong>
                      </span>
                      <span>
                        dur{" "}
                        <strong className="font-semibold text-nightFg">
                          {selectedRun.duration_ms ? `${selectedRun.duration_ms}ms` : "n/a"}
                        </strong>
                      </span>
                      <span>
                        exit{" "}
                        <strong className="font-semibold text-nightFg">
                          {selectedRun.exit_code !== null ? selectedRun.exit_code : "n/a"}
                        </strong>
                      </span>
                    </div>
                  </div>
                  {selectedRun.output && (
                    <button
                      onClick={handleCopyOutput}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-nightLine bg-night px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-nightFg transition-colors hover:bg-nightRaised"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "copied" : "copy"}
                    </button>
                  )}
                </div>

                <div className="flex-1 select-text overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-nightFg">
                  {selectedRun.output ? (
                    selectedRun.output
                  ) : (
                    <span className="italic text-nightMuted">No output produced for this execution.</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-nightMuted">
                <Terminal className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-[12px]">Select a run to inspect its streamed output.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="kbd !text-[10px]">Esc</kbd> close
          </span>
          <button onClick={onClose} className="btn-quiet !px-3 !py-1.5 !text-[11px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunHistoryModal;
