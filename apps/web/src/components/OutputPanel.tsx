import React, { useEffect, useRef, useState } from "react";
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
  Sparkles,
  Copy,
  Check,
  X,
  Bot,
} from "lucide-react";

export type RunStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "oom";

export interface ExplanationData {
  explanation: string;
  suggested_fix?: string;
  model?: string;
  is_ai?: boolean;
}

interface OutputPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  status: RunStatus;
  output: string;
  durationMs?: number | null;
  exitCode?: number | null;
  onClear: () => void;
  onExplainError?: () => void;
  isExplaining?: boolean;
  explanationData?: ExplanationData | null;
  onClearExplanation?: () => void;
}

const badgeBase =
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] border";

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isOpen,
  onToggle,
  status,
  output,
  durationMs,
  exitCode,
  onClear,
  onExplainError,
  isExplaining = false,
  explanationData = null,
  onClearExplanation,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copiedFix, setCopiedFix] = useState(false);

  // Auto-scroll to bottom as output streams in
  useEffect(() => {
    if (isOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isOpen]);

  const hasError =
    status === "failed" ||
    status === "timeout" ||
    status === "oom" ||
    (status === "completed" && exitCode !== null && exitCode !== 0);

  const handleCopyFix = () => {
    if (!explanationData?.suggested_fix) return;
    navigator.clipboard.writeText(explanationData.suggested_fix);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const renderStatusBadge = () => {
    switch (status) {
      case "queued":
        return (
          <span className={`${badgeBase} bg-amber-500/10 text-amber-400 border-amber-500/25`}>
            <Loader2 className="w-3 h-3 animate-spin" /> Queued
          </span>
        );
      case "running":
        return (
          <span className={`${badgeBase} bg-accent/10 text-accentText border-accent/25`}>
            <Loader2 className="w-3 h-3 animate-spin" /> Executing
          </span>
        );
      case "completed":
        return exitCode === 0 ? (
          <span className={`${badgeBase} bg-emerald-500/10 text-emerald-400 border-emerald-500/25`}>
            <CheckCircle2 className="w-3 h-3" /> Exit {exitCode}
          </span>
        ) : (
          <span className={`${badgeBase} bg-rose-500/10 text-rose-400 border-rose-500/25`}>
            <XCircle className="w-3 h-3" /> Exit {exitCode}
          </span>
        );
      case "failed":
        return (
          <span className={`${badgeBase} bg-rose-500/10 text-rose-400 border-rose-500/25`}>
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "timeout":
        return (
          <span className={`${badgeBase} bg-amber-500/10 text-amber-400 border-amber-500/25`}>
            <AlertTriangle className="w-3 h-3" /> Timeout
          </span>
        );
      case "oom":
        return (
          <span className={`${badgeBase} bg-purple-500/10 text-purple-400 border-purple-500/25`}>
            <AlertTriangle className="w-3 h-3" /> OOM
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`mt-2 flex flex-col flex-shrink-0 overflow-hidden rounded-xl border border-line bg-surface transition-all duration-200 ${
        isOpen ? "h-72" : "h-10"
      }`}
    >
      {/* Header / Toolbar */}
      <div className="h-10 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 select-none border-b border-line bg-raised/40">
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 text-muted hover:text-fg transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-accentText" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
            Output
          </span>
          <span className="hidden sm:inline-flex">{renderStatusBadge()}</span>
          {durationMs !== undefined && durationMs !== null && status !== "idle" && status !== "queued" && (
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-muted">
              <Clock className="w-3 h-3" />
              {durationMs}ms
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Explain with AI Button */}
          {hasError && onExplainError && (
            <button
              onClick={onExplainError}
              disabled={isExplaining}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 transition-all disabled:opacity-50"
              title="Explain this error with AI"
            >
              {isExplaining ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{isExplaining ? "Analyzing…" : "Explain"}</span>
            </button>
          )}

          {output && (
            <button
              onClick={onClear}
              className="flex h-7 w-7 items-center justify-center text-muted hover:text-fg hover:bg-raised rounded-md transition-colors"
              title="Clear output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center text-muted hover:text-fg hover:bg-raised rounded-md transition-colors"
            title={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal View */}
      {isOpen && (
        <div className="flex-1 p-3.5 overflow-y-auto font-mono text-[12px] text-fg bg-night leading-relaxed flex flex-col gap-3">
          {output ? (
            <pre className="whitespace-pre-wrap break-words font-mono font-normal text-nightFg">
              {output}
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center text-nightMuted select-none">
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5 text-center font-mono text-[11px]">
                <kbd className="rounded border border-nightLine bg-nightRaised px-1.5 py-0.5 text-nightFg">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded border border-nightLine bg-nightRaised px-1.5 py-0.5 text-nightFg">Enter</kbd>
                <span className="text-nightMuted">or hit Run to execute in the sandbox</span>
              </span>
            </div>
          )}

          {/* AI Explanation Callout Card */}
          {explanationData && (
            <div className="animate-pop-in space-y-2.5 rounded-lg border border-purple-500/25 bg-purple-500/[0.07] p-3.5 font-sans text-xs text-fg">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded bg-purple-500/15 p-1 text-purple-300">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-purple-200">Error analysis</span>
                  <span className="rounded border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">
                    {explanationData.model || "heuristic"}
                  </span>
                </div>
                {onClearExplanation && (
                  <button
                    onClick={onClearExplanation}
                    className="rounded p-1 text-muted hover:bg-purple-500/15 hover:text-fg"
                    title="Dismiss explanation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted">
                {explanationData.explanation}
              </div>

              {explanationData.suggested_fix && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-purple-300">Suggested fix</span>
                    <button
                      onClick={handleCopyFix}
                      className="flex items-center gap-1 rounded border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200 transition-colors hover:bg-purple-500/20"
                    >
                      {copiedFix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFix ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-line bg-night p-2.5 font-mono text-[11px] text-nightFg">
                    {explanationData.suggested_fix}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
      )}
    </div>
  );
};

export default OutputPanel;
