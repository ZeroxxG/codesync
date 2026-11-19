import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Share2,
  Eye,
  ShieldCheck,
  Sun,
  Moon,
  History,
  PanelBottom,
  Sidebar as SidebarIcon,
  Check,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

interface TitleBarProps {
  roomName: string;
  roomSlug: string;
  userRole: "owner" | "editor" | "viewer" | "none";
  activeFileName: string;
  isExecuting: boolean;
  onRunCode: () => void;
  onOpenShare: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts: () => void;
  onLeaveRoom: () => void;
  onToggleSidebar: () => void;
  onToggleBottomPanel: () => void;
  onSaveSnapshot?: () => void;
  bottomPanelOpen: boolean;
  sidebarOpen: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  roomName,
  roomSlug,
  userRole,
  activeFileName,
  isExecuting,
  onRunCode,
  onOpenShare,
  onOpenHistory,
  onOpenShortcuts,
  onLeaveRoom,
  onToggleSidebar,
  onToggleBottomPanel,
  onSaveSnapshot,
  bottomPanelOpen,
  sidebarOpen,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isReadOnly = userRole === "viewer";

  return (
    <header className="h-9 bg-vscode-toolbar border-b border-vscode-border flex items-center justify-between px-2 text-xs select-none z-30">
      {/* Left: Branding & App Menus */}
      <div className="flex items-center gap-1" ref={menuRef}>
        <div className="flex items-center gap-1.5 px-2 py-0.5 mr-1 font-semibold text-vscode-text tracking-tight">
          <div className="w-4 h-4 rounded bg-[#007acc] flex items-center justify-center text-white font-mono text-[10px] font-bold">
            CS
          </div>
          <span className="hidden md:inline font-sans font-medium text-[13px]">CodeSync</span>
        </div>

        {/* Desktop IDE Menus */}
        <div className="hidden sm:flex items-center text-[12px] text-vscode-muted">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
              className={`px-2 py-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors ${
                activeMenu === "file" ? "bg-vscode-hover text-vscode-text" : ""
              }`}
            >
              File
            </button>
            {activeMenu === "file" && (
              <div className="absolute left-0 top-full mt-0.5 w-52 bg-vscode-sidebar border border-vscode-border shadow-xl py-1 rounded-sm z-50 text-vscode-text font-normal">
                {onSaveSnapshot && (
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onSaveSnapshot();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                  >
                    <span>Save Snapshot</span>
                    <span className="text-[10px] text-vscode-muted font-mono">Ctrl+S</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onOpenShare();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Share Workspace...</span>
                </button>
                <div className="border-t border-vscode-border my-1" />
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onLeaveRoom();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover text-rose-400"
                >
                  Close Room
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === "edit" ? null : "edit")}
              className={`px-2 py-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors ${
                activeMenu === "edit" ? "bg-vscode-hover text-vscode-text" : ""
              }`}
            >
              Edit
            </button>
            {activeMenu === "edit" && (
              <div className="absolute left-0 top-full mt-0.5 w-48 bg-vscode-sidebar border border-vscode-border shadow-xl py-1 rounded-sm z-50 text-vscode-text font-normal">
                <div className="px-3 py-1 text-[11px] text-vscode-muted">Monaco Keybindings Active</div>
                <div className="border-t border-vscode-border my-1" />
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onOpenShortcuts();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Keyboard Shortcuts</span>
                  <span className="text-[10px] text-vscode-muted">?</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === "view" ? null : "view")}
              className={`px-2 py-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors ${
                activeMenu === "view" ? "bg-vscode-hover text-vscode-text" : ""
              }`}
            >
              View
            </button>
            {activeMenu === "view" && (
              <div className="absolute left-0 top-full mt-0.5 w-52 bg-vscode-sidebar border border-vscode-border shadow-xl py-1 rounded-sm z-50 text-vscode-text font-normal">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleSidebar();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Toggle Primary Sidebar</span>
                  {sidebarOpen && <Check className="w-3.5 h-3.5 text-[#007acc]" />}
                </button>
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onToggleBottomPanel();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Toggle Bottom Panel</span>
                  {bottomPanelOpen && <Check className="w-3.5 h-3.5 text-[#007acc]" />}
                </button>
                <div className="border-t border-vscode-border my-1" />
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    toggleTheme();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Color Theme ({theme === "dark" ? "Dark" : "Light"})</span>
                </button>
              </div>
            )}
          </div>

          {/* Run Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === "run" ? null : "run")}
              className={`px-2 py-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors ${
                activeMenu === "run" ? "bg-vscode-hover text-vscode-text" : ""
              }`}
            >
              Run
            </button>
            {activeMenu === "run" && (
              <div className="absolute left-0 top-full mt-0.5 w-56 bg-vscode-sidebar border border-vscode-border shadow-xl py-1 rounded-sm z-50 text-vscode-text font-normal">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    if (!isReadOnly && !isExecuting) onRunCode();
                  }}
                  disabled={isReadOnly || isExecuting}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between disabled:opacity-50"
                >
                  <span>Run Sandbox Execution</span>
                  <span className="text-[10px] text-vscode-muted font-mono">Ctrl+Enter</span>
                </button>
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onOpenHistory();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover flex items-center justify-between"
                >
                  <span>Execution History</span>
                  <span className="text-[10px] text-vscode-muted font-mono">Ctrl+H</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === "help" ? null : "help")}
              className={`px-2 py-1 rounded hover:bg-vscode-hover hover:text-vscode-text transition-colors ${
                activeMenu === "help" ? "bg-vscode-hover text-vscode-text" : ""
              }`}
            >
              Help
            </button>
            {activeMenu === "help" && (
              <div className="absolute left-0 top-full mt-0.5 w-48 bg-vscode-sidebar border border-vscode-border shadow-xl py-1 rounded-sm z-50 text-vscode-text font-normal">
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onOpenShortcuts();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-vscode-hover"
                >
                  Keyboard Shortcuts (?)
                </button>
                <div className="border-t border-vscode-border my-1" />
                <div className="px-3 py-1 text-[11px] text-vscode-muted">
                  CodeSync IDE v0.1.0
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Window Title & Breadcrumb Header */}
      <div className="flex items-center gap-2 max-w-[40%] truncate text-center">
        <span className="text-[12px] font-medium text-vscode-text truncate">
          {activeFileName} — {roomName || "Workspace"}
        </span>
        <span className="text-[11px] font-mono text-vscode-muted hidden lg:inline">
          [{roomSlug}]
        </span>
        {isReadOnly ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Eye className="w-2.5 h-2.5" /> Read-Only
          </span>
        ) : userRole === "owner" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <ShieldCheck className="w-2.5 h-2.5" /> Owner
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Editor
          </span>
        )}
      </div>

      {/* Right: Layout & Functional Controls */}
      <div className="flex items-center gap-1">
        {/* Run Execution Button */}
        <button
          onClick={onRunCode}
          disabled={isReadOnly || isExecuting}
          title={
            isReadOnly
              ? "Viewers cannot execute code"
              : isExecuting
              ? "Execution in progress..."
              : "Run Code in Sandbox (Ctrl+Enter)"
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
            isReadOnly
              ? "opacity-50 cursor-not-allowed bg-vscode-hover text-vscode-muted"
              : isExecuting
              ? "bg-amber-600/40 text-amber-200 cursor-wait animate-pulse border border-amber-500/40"
              : "bg-[#0e639c] hover:bg-[#1177bb] text-white border border-[#1177bb]"
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">{isExecuting ? "Executing..." : "Run"}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-vscode-hover text-vscode-text transition-colors border border-transparent hover:border-vscode-border"
          title="Share room invitation link"
        >
          <Share2 className="w-3.5 h-3.5 text-vscode-muted" />
          <span className="hidden md:inline">Share</span>
        </button>

        {/* Execution History */}
        <button
          onClick={onOpenHistory}
          className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
          title="Run History (Ctrl+H)"
        >
          <History className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Primary Sidebar */}
        <button
          onClick={onToggleSidebar}
          className={`p-1 rounded transition-colors ${
            sidebarOpen ? "text-[#007acc] bg-vscode-hover" : "text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover"
          }`}
          title="Toggle Primary Sidebar"
        >
          <SidebarIcon className="w-3.5 h-3.5" />
        </button>

        {/* Toggle Bottom Panel */}
        <button
          onClick={onToggleBottomPanel}
          className={`p-1 rounded transition-colors ${
            bottomPanelOpen ? "text-[#007acc] bg-vscode-hover" : "text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover"
          }`}
          title="Toggle Bottom Terminal Panel"
        >
          <PanelBottom className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors ml-0.5"
          title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
        </button>
      </div>
    </header>
  );
};

export default TitleBar;
