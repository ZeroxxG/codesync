import React from "react";
import {
  FileCode,
  X,
  Play,
  Loader2,
  ChevronDown,
  PanelBottom,
} from "lucide-react";

interface EditorTabsProps {
  currentLanguage: string;
  isExecuting: boolean;
  isReadOnly: boolean;
  onRunCode: () => void;
  onSelectLanguage?: (lang: string) => void;
  onToggleBottomPanel?: () => void;
  onCloseTab?: () => void;
  bottomPanelOpen?: boolean;
}

const getLanguageFileName = (lang: string) => {
  switch (lang.toLowerCase()) {
    case "javascript":
      return "main.js";
    case "cpp":
      return "main.cpp";
    case "python":
    default:
      return "main.py";
  }
};

const getLanguageIconColor = (lang: string) => {
  switch (lang.toLowerCase()) {
    case "javascript":
      return "text-yellow-400";
    case "cpp":
      return "text-blue-400";
    case "python":
    default:
      return "text-emerald-400";
  }
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  currentLanguage,
  isExecuting,
  isReadOnly,
  onRunCode,
  onSelectLanguage,
  onToggleBottomPanel,
  onCloseTab,
  bottomPanelOpen,
}) => {
  const fileName = getLanguageFileName(currentLanguage);

  return (
    <div className="h-9 bg-vscode-toolbar border-b border-vscode-border flex items-center justify-between select-none text-xs z-10 flex-shrink-0">
      {/* Tabs List */}
      <div className="flex items-center h-full overflow-x-auto no-scrollbar">
        {/* Active Tab */}
        <div className="h-full px-3.5 bg-vscode-editor text-vscode-text border-t-2 border-[#007acc] border-r border-vscode-border flex items-center gap-2 font-medium cursor-pointer flex-shrink-0">
          <FileCode className={`w-3.5 h-3.5 ${getLanguageIconColor(currentLanguage)}`} />
          <span className="truncate">{fileName}</span>
          {onCloseTab && (
            <button
              className="p-0.5 ml-1 rounded hover:bg-vscode-hover text-vscode-muted hover:text-vscode-text transition-colors"
              title="Close Workspace (Leave Room)"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab();
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 px-2">
        {/* Language Quick Dropdown */}
        {onSelectLanguage && (
          <div className="relative flex items-center">
            <select
              value={currentLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              disabled={isReadOnly}
              className="bg-transparent hover:bg-vscode-hover text-vscode-muted hover:text-vscode-text text-[11px] font-medium py-1 pl-2 pr-6 rounded border-none focus:outline-none cursor-pointer disabled:cursor-not-allowed appearance-none"
              title="Select Language Mode"
            >
              <option value="python" className="bg-vscode-sidebar text-vscode-text">Python</option>
              <option value="javascript" className="bg-vscode-sidebar text-vscode-text">JavaScript</option>
              <option value="cpp" className="bg-vscode-sidebar text-vscode-text">C++</option>
            </select>
            <ChevronDown className="w-3 h-3 text-vscode-muted absolute right-1 pointer-events-none" />
          </div>
        )}

        {/* Run Button in Tab Strip */}
        <button
          onClick={onRunCode}
          disabled={isReadOnly || isExecuting}
          title={
            isReadOnly
              ? "Read-only mode"
              : isExecuting
              ? "Executing code in sandbox..."
              : "Run Code (Ctrl+Enter)"
          }
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
            isReadOnly
              ? "text-vscode-muted cursor-not-allowed opacity-50"
              : isExecuting
              ? "bg-amber-600/80 text-white animate-pulse"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {isExecuting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span className="hidden sm:inline">{isExecuting ? "Running..." : "Run"}</span>
        </button>

        {/* Toggle Terminal Panel */}
        {onToggleBottomPanel && (
          <button
            onClick={onToggleBottomPanel}
            title={bottomPanelOpen ? "Hide Terminal / Bottom Panel" : "Show Terminal / Bottom Panel"}
            className={`p-1.5 rounded hover:bg-vscode-hover transition-colors ${
              bottomPanelOpen ? "text-[#007acc]" : "text-vscode-muted hover:text-vscode-text"
            }`}
          >
            <PanelBottom className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorTabs;
