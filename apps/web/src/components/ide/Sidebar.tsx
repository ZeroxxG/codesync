import React, { useState } from "react";
import {
  FolderOpen,
  FileCode,
  ChevronRight,
  ChevronDown,
  X,
  Play,
  Loader2,
  Share2,
  ShieldCheck,
  Eye,
  History,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { ActivityBarTab } from "./ActivityBar";

export interface ConnectedUser {
  clientId: number;
  name: string;
  color: string;
  isSelf?: boolean;
}

interface SidebarProps {
  activeTab: ActivityBarTab;
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  roomSlug: string;
  currentLanguage: string;
  userRole: "owner" | "editor" | "viewer" | "none";
  connectedUsers: ConnectedUser[];
  isExecuting: boolean;
  onRunCode: () => void;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  runStatus?: string;
  runExitCode?: number | null;
  runDurationMs?: number | null;
  onSelectLanguage?: (lang: string) => void;
  onTriggerFind?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  isOpen,
  onClose,
  roomName,
  roomSlug,
  currentLanguage,
  userRole,
  connectedUsers,
  isExecuting,
  onRunCode,
  onOpenShare,
  onOpenHistory,
  onOpenShortcuts,
  runStatus = "idle",
  runExitCode,
  runDurationMs,
  onSelectLanguage,
  onTriggerFind,
}) => {
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [roomInfoExpanded, setRoomInfoExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const activeFileName = getLanguageFileName(currentLanguage);
  const isReadOnly = userRole === "viewer";

  return (
    <aside
      className="w-64 h-full bg-vscode-sidebar border-r border-vscode-border flex flex-col select-none text-vscode-text text-xs z-10 flex-shrink-0"
      aria-label="Sidebar Panel"
    >
      {/* Sidebar Header */}
      <div className="h-9 px-3 border-b border-vscode-border flex items-center justify-between text-vscode-muted font-semibold tracking-wider text-[11px] uppercase flex-shrink-0">
        <span className="truncate">
          {activeTab === "explorer" && "Explorer"}
          {activeTab === "search" && "Search"}
          {activeTab === "run" && "Run & Sandbox"}
          {activeTab === "collab" && "Collaboration"}
          {activeTab === "history" && "Execution History"}
          {activeTab === "settings" && "Room Settings"}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors"
          title="Collapse Primary Sidebar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sidebar Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 font-sans">
        {/* VIEW 1: EXPLORER */}
        {activeTab === "explorer" && (
          <div className="py-1">
            {/* Folder 1: Workspace */}
            <div>
              <button
                onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
                className="w-full flex items-center gap-1 px-2 py-1 text-vscode-text font-bold uppercase tracking-wider text-[10px] hover:bg-vscode-hover transition-colors"
              >
                {workspaceExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-vscode-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-vscode-muted" />
                )}
                <span className="truncate">CODESYNC WORKSPACE</span>
              </button>

              {workspaceExpanded && (
                <div className="pl-2">
                  {/* Folder: src */}
                  <div className="flex items-center gap-1.5 px-3 py-1 text-vscode-muted">
                    <FolderOpen className="w-4 h-4 text-[#007acc]" />
                    <span className="font-medium text-vscode-text">src</span>
                  </div>

                  {/* Active Source File */}
                  <div className="pl-4">
                    <div className="flex items-center justify-between px-3 py-1 bg-vscode-active text-vscode-text font-medium border-l-2 border-[#007acc] cursor-default">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode className={`w-3.5 h-3.5 ${getLanguageIconColor(currentLanguage)}`} />
                        <span className="truncate">{activeFileName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#007acc] ml-1">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Folder 2: Room Info */}
            <div className="mt-2 border-t border-vscode-border pt-1">
              <button
                onClick={() => setRoomInfoExpanded(!roomInfoExpanded)}
                className="w-full flex items-center gap-1 px-2 py-1 text-vscode-text font-bold uppercase tracking-wider text-[10px] hover:bg-vscode-hover transition-colors"
              >
                {roomInfoExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-vscode-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-vscode-muted" />
                )}
                <span>SESSION DETAILS</span>
              </button>

              {roomInfoExpanded && (
                <div className="px-3 py-2 space-y-2 text-[11px]">
                  <div>
                    <span className="text-vscode-muted block text-[10px] uppercase">Room Name</span>
                    <span className="font-medium text-vscode-text truncate block">{roomName}</span>
                  </div>
                  <div>
                    <span className="text-vscode-muted block text-[10px] uppercase">Slug Identifier</span>
                    <span className="font-mono text-vscode-text truncate block">#{roomSlug}</span>
                  </div>
                  <div>
                    <span className="text-vscode-muted block text-[10px] uppercase">Your Permission</span>
                    <div className="mt-0.5">
                      {isReadOnly ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                          <Eye className="w-3 h-3" /> Viewer (Read-Only)
                        </span>
                      ) : userRole === "owner" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
                          <ShieldCheck className="w-3 h-3" /> Room Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                          Editor (Collaborator)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-vscode-muted block text-[10px] uppercase">Sync Engine</span>
                    <span className="font-mono text-[10px] text-vscode-muted">Yjs CRDT + Hocuspocus WS</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: SEARCH */}
        {activeTab === "search" && (
          <div className="p-3 space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onTriggerFind?.();
              }}
              className="space-y-2"
            >
              <label className="text-[10px] uppercase font-bold text-vscode-muted block">
                Find in Collaborative Buffer
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type query and press Enter..."
                  className="w-full bg-vscode-input border border-vscode-border rounded px-2.5 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
                />
                <Search className="w-3.5 h-3.5 text-vscode-muted absolute right-2 top-2 pointer-events-none" />
              </div>
              <button
                type="submit"
                className="w-full py-1 px-2.5 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium rounded transition-colors"
              >
                Find in Editor (Enter)
              </button>
            </form>
            <p className="text-[11px] text-vscode-muted leading-relaxed">
              Use <kbd className="px-1 py-0.5 bg-vscode-hover border border-vscode-border rounded font-mono text-[10px]">Ctrl+F</kbd> inside the Monaco Editor for incremental search and replace with regex and case-matching support.
            </p>
          </div>
        )}

        {/* VIEW 3: RUN & DEBUG / SANDBOX */}
        {activeTab === "run" && (
          <div className="p-3 space-y-4">
            <div>
              <button
                onClick={onRunCode}
                disabled={isReadOnly || isExecuting}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded font-medium text-xs transition-colors shadow-sm ${
                  isReadOnly
                    ? "bg-vscode-hover text-vscode-muted cursor-not-allowed"
                    : isExecuting
                    ? "bg-amber-600 text-white animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing in Sandbox...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Code (Ctrl+Enter)</span>
                  </>
                )}
              </button>
            </div>

            {/* Recent Execution Status */}
            <div className="p-2.5 rounded bg-vscode-hover/40 border border-vscode-border space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-vscode-muted block">Last Execution</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-vscode-muted">Status:</span>
                <span className="font-mono font-medium capitalize">
                  {runStatus === "completed" && runExitCode === 0 && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Success (0)
                    </span>
                  )}
                  {runStatus === "completed" && runExitCode !== 0 && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Exit ({runExitCode})
                    </span>
                  )}
                  {runStatus === "failed" && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                  {runStatus === "idle" && <span className="text-vscode-muted">Idle</span>}
                  {runStatus === "running" && <span className="text-amber-400">Running...</span>}
                  {runStatus === "queued" && <span className="text-amber-400">Queued</span>}
                </span>
              </div>
              {runDurationMs !== undefined && runDurationMs !== null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-vscode-muted">Duration:</span>
                  <span className="font-mono text-vscode-text">{runDurationMs}ms</span>
                </div>
              )}
            </div>

            {/* Sandbox Container Isolation Details */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-vscode-muted block">
                Sandbox Specifications
              </span>
              <div className="p-2.5 rounded bg-vscode-hover/30 border border-vscode-border text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">Isolation:</span>
                  <span className="text-vscode-text">Docker Runner</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">Network:</span>
                  <span className="text-emerald-400 font-semibold">none (Air-gapped)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">Memory Limit:</span>
                  <span className="text-vscode-text">128 MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">CPU Quota:</span>
                  <span className="text-vscode-text">0.50 Cores</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">Timeout:</span>
                  <span className="text-vscode-text">10.0s Hard Kill</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vscode-muted font-sans">Filesystem:</span>
                  <span className="text-vscode-text">tmpfs (Read-only root)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: COLLABORATION / PEERS */}
        {activeTab === "collab" && (
          <div className="p-3 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-vscode-muted">
                Active Collaborators ({connectedUsers.length})
              </span>
              <button
                onClick={onOpenShare}
                className="text-[10px] text-[#007acc] hover:underline flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> Invite
              </button>
            </div>

            <div className="space-y-1">
              {connectedUsers.map((u) => (
                <div
                  key={u.clientId}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-vscode-hover transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm flex-shrink-0"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.charAt(0) || "U"}
                    </span>
                    <span className="truncate font-medium text-vscode-text text-[11px]">
                      {u.name} {u.isSelf && "(You)"}
                    </span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                </div>
              ))}
              {connectedUsers.length === 0 && (
                <p className="text-vscode-muted text-[11px] italic py-2">
                  No other active peers connected.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-vscode-border">
              <button
                onClick={onOpenShare}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-medium transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Invite Link</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: HISTORY */}
        {activeTab === "history" && (
          <div className="p-3 space-y-3">
            <span className="text-[10px] uppercase font-bold text-vscode-muted block">
              Execution Logs
            </span>
            <p className="text-[11px] text-vscode-muted">
              View all recorded code executions, exit statuses, stdout/stderr streams, and duration metrics.
            </p>
            <button
              onClick={onOpenHistory}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-vscode-hover hover:bg-vscode-hover/80 border border-vscode-border rounded text-xs font-medium text-vscode-text transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Open Execution History Log</span>
            </button>
          </div>
        )}

        {/* VIEW 6: SETTINGS */}
        {activeTab === "settings" && (
          <div className="p-3 space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-vscode-muted block mb-1">
                Room Language
              </label>
              <select
                value={currentLanguage}
                onChange={(e) => onSelectLanguage?.(e.target.value)}
                disabled={isReadOnly}
                className="w-full bg-vscode-input border border-vscode-border rounded px-2.5 py-1.5 text-xs text-vscode-text focus:outline-none focus:border-[#007acc] disabled:opacity-50"
              >
                <option value="python">Python 3 (CPython 3.12)</option>
                <option value="javascript">JavaScript (Node.js 20)</option>
                <option value="cpp">C++ (GCC 12 / C++20)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-vscode-muted block mb-1">
                Keybindings
              </span>
              <button
                onClick={onOpenShortcuts}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-vscode-hover border border-vscode-border rounded text-xs font-medium text-vscode-text hover:bg-vscode-hover/80 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Keyboard Shortcuts (?)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
