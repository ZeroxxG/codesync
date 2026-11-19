import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  AlertCircle,
  Sparkles,
  History,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Bot,
} from "lucide-react";
import { RunStatus, ExplanationData } from "../OutputPanel";

export type BottomPanelTab = "terminal" | "problems" | "ai";

interface BottomPanelProps {
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
  onOpenHistoryModal?: () => void;
  activeTab?: BottomPanelTab;
  onSelectTab?: (tab: BottomPanelTab) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
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
  onOpenHistoryModal,
  activeTab: controlledTab,
  onSelectTab,
}) => {
  const [internalTab, setInternalTab] = useState<BottomPanelTab>("terminal");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: BottomPanelTab) => {
    onSelectTab?.(tab);
    setInternalTab(tab);
  };
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-switch to AI tab when explanation arrives
  useEffect(() => {
    if (explanationData) {
      setActiveTab("ai");
    }
  }, [explanationData]);

  // Auto-switch to terminal tab when a run starts
  useEffect(() => {
    if (status === "running" || status === "queued") {
      setActiveTab("terminal");
    }
  }, [status]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (isOpen && activeTab === "terminal" && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isOpen, activeTab]);

  if (!isOpen) return null;

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
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Queued
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Executing...
          </span>
        );
      case "completed":
        return exitCode === 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Exit 0
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400">
            <XCircle className="w-3 h-3" /> Exit {exitCode}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
            <AlertTriangle className="w-3 h-3" /> Timeout (10s)
          </span>
        );
      case "oom":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-400">
            <AlertTriangle className="w-3 h-3" /> OOM Limit
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`border-t border-vscode-border bg-vscode-panel flex flex-col z-20 flex-shrink-0 select-none ${
        isMaximized ? "h-[70vh]" : "h-64"
      }`}
    >
      {/* Panel Tab Strip & Action Toolbar */}
      <div className="h-9 px-2 bg-vscode-toolbar border-b border-vscode-border flex items-center justify-between flex-shrink-0 text-xs">
        {/* Tab Headers */}
        <div className="flex items-center h-full gap-1">
          {/* Terminal / Output Tab */}
          <button
            onClick={() => setActiveTab("terminal")}
            className={`h-full px-3 flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wider transition-colors ${
              activeTab === "terminal"
                ? "text-vscode-text border-b-2 border-[#007acc] font-semibold"
                : "text-vscode-muted hover:text-vscode-text"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal / Output</span>
          </button>

          {/* Problems Tab */}
          <button
            onClick={() => setActiveTab("problems")}
            className={`h-full px-3 flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wider transition-colors ${
              activeTab === "problems"
                ? "text-vscode-text border-b-2 border-[#007acc] font-semibold"
                : "text-vscode-muted hover:text-vscode-text"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Problems</span>
            {hasError && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                1
              </span>
            )}
          </button>

          {/* AI Diagnosis Tab */}
          <button
            onClick={() => setActiveTab("ai")}
            className={`h-full px-3 flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wider transition-colors ${
              activeTab === "ai"
                ? "text-vscode-text border-b-2 border-[#007acc] font-semibold"
                : "text-vscode-muted hover:text-vscode-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Diagnosis</span>
            {explanationData && (
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            )}
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          {/* Status info */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            {renderStatusBadge()}
            {durationMs !== undefined && durationMs !== null && status !== "idle" && status !== "queued" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-vscode-muted">
                <Clock className="w-3 h-3" />
                {durationMs}ms
              </span>
            )}
          </div>

          {/* Explain with AI Action */}
          {hasError && onExplainError && (
            <button
              onClick={onExplainError}
              disabled={isExplaining}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all disabled:opacity-50"
              title="Explain traceback error with AI"
            >
              {isExplaining ? (
                <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
              ) : (
                <Sparkles className="w-3 h-3 text-purple-400" />
              )}
              <span className="hidden md:inline">{isExplaining ? "Analyzing..." : "Explain with AI"}</span>
            </button>
          )}

          {/* Run History Trigger */}
          {onOpenHistoryModal && (
            <button
              onClick={onOpenHistoryModal}
              className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
              title="Execution History Logs"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clear Output */}
          {output && activeTab === "terminal" && (
            <button
              onClick={onClear}
              className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
              title="Clear Terminal Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Maximize / Restore Toggle */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
            title={isMaximized ? "Restore Panel Size" : "Maximize Panel Size"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Panel */}
          <button
            onClick={onToggle}
            className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Terminal Content */}
      {activeTab === "terminal" && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-vscode-text leading-relaxed select-text flex flex-col gap-2 bg-vscode-panel">
          {output ? (
            <pre className="whitespace-pre-wrap break-all font-mono">
              {output}
            </pre>
          ) : (
            <div className="text-vscode-muted flex flex-col gap-1 py-2 font-sans text-xs">
              <p>Sandbox terminal initialized. Press &quot;Run&quot; or Ctrl+Enter to execute.</p>
              <div className="flex items-center gap-2 text-[11px] text-vscode-muted/80 font-mono mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Docker Sandbox &bull; Network: none &bull; Memory: 128MB &bull; Timeout: 10s</span>
              </div>
            </div>
          )}

          {status === "running" && (
            <div className="flex items-center gap-2 text-amber-400 font-sans text-xs animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Execution in progress...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
      )}

      {/* Tab 2: Problems Content */}
      {activeTab === "problems" && (
        <div className="flex-1 p-3 overflow-y-auto text-xs font-sans text-vscode-text bg-vscode-panel">
          {hasError ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-vscode-text">
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <span className="font-semibold text-rose-400 block">
                    Execution Terminated with Error (Exit Code: {exitCode ?? "Non-zero"})
                  </span>
                  <p className="text-vscode-muted font-mono text-[11px]">
                    {output.trim().split("\n").slice(-3).join("\n") || "Process failed during execution"}
                  </p>
                  {onExplainError && (
                    <button
                      onClick={onExplainError}
                      className="inline-flex items-center gap-1 mt-1 text-purple-400 hover:text-purple-300 font-medium text-xs"
                    >
                      <Sparkles className="w-3 h-3" /> Explain this error with AI &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-vscode-muted py-4 text-center font-sans">
              No problems have been detected in the current workspace.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI Diagnosis Content */}
      {activeTab === "ai" && (
        <div className="flex-1 p-3 overflow-y-auto text-xs text-vscode-text bg-vscode-panel select-text">
          {isExplaining && (
            <div className="flex items-center gap-3 py-6 justify-center text-purple-400 font-sans">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing traceback and generating diagnosis with Gemini AI...</span>
            </div>
          )}

          {!isExplaining && explanationData && (
            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-vscode-border">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-vscode-text">AI Diagnostic Analysis</span>
                  {explanationData.model && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {explanationData.model}
                    </span>
                  )}
                </div>
                {onClearExplanation && (
                  <button
                    onClick={onClearExplanation}
                    className="text-vscode-muted hover:text-vscode-text text-xs"
                  >
                    Dismiss
                  </button>
                )}
              </div>

              {/* Explanation text */}
              <div className="p-3 rounded bg-vscode-hover/30 border border-vscode-border leading-relaxed whitespace-pre-wrap text-vscode-text">
                {explanationData.explanation}
              </div>

              {/* Suggested fix */}
              {explanationData.suggested_fix && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Suggested Fix
                    </span>
                    <button
                      onClick={handleCopyFix}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-vscode-hover hover:bg-vscode-hover/80 text-vscode-text text-[11px] border border-vscode-border transition-colors"
                    >
                      {copiedFix ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Fix</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded bg-vscode-input border border-vscode-border font-mono text-xs overflow-x-auto text-emerald-300">
                    {explanationData.suggested_fix}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!isExplaining && !explanationData && (
            <div className="py-6 text-center text-vscode-muted font-sans space-y-1">
              <Sparkles className="w-6 h-6 mx-auto text-purple-400/60 mb-2" />
              <p className="font-medium text-vscode-text">No Active AI Diagnosis</p>
              <p className="text-xs max-w-sm mx-auto">
                When code execution produces an error or non-zero exit code, click &quot;Explain with AI&quot; to diagnose root causes and get suggested fixes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BottomPanel;
