import React, { useEffect, useRef } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export type RunStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "oom";

interface OutputPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  status: RunStatus;
  output: string;
  durationMs?: number | null;
  exitCode?: number | null;
  onClear: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isOpen,
  onToggle,
  status,
  output,
  durationMs,
  exitCode,
  onClear,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as output streams in
  useEffect(() => {
    if (isOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isOpen]);

  const renderStatusBadge = () => {
    switch (status) {
      case "queued":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" /> Queued
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Executing in Sandbox...
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Exit {exitCode ?? 0}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed (Exit {exitCode ?? 1})
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Timeout (10s)
          </span>
        );
      case "oom":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> OOM Limit
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 transition-all duration-200 flex flex-col flex-shrink-0 ${
        isOpen ? "h-64" : "h-9"
      }`}
    >
      {/* Header / Toolbar */}
      <div className="h-9 px-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 select-none">
        <div
          onClick={onToggle}
          className="flex items-center gap-2.5 cursor-pointer hover:text-white text-slate-300 transition-colors"
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Terminal Output
          </span>
          {renderStatusBadge()}
          {durationMs !== undefined && durationMs !== null && status !== "idle" && status !== "queued" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              {durationMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {output && (
            <button
              onClick={onClear}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal View */}
      {isOpen && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950/95 leading-relaxed selection:bg-slate-700">
          {output ? (
            <pre className="whitespace-pre-wrap break-words font-mono font-normal">
              {output}
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 select-none">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">Ctrl+Enter</kbd> or click Run to execute code in sandboxed Docker container.</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
