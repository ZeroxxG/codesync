import React, { useState } from "react";
import {
  FolderPlus,
  ArrowRight,
  LogIn,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Clock,
  Terminal,
  ShieldCheck,
  Sparkles,
  Zap,
  Code2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import AuthModal from "../components/AuthModal";

interface HomePageProps {
  onJoinRoom: (slug: string, userName: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onJoinRoom }) => {
  const { user, isAuthenticated, logout, authFetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("codesync_user") || `dev-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [roomSlug, setRoomSlug] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [recentRooms, setRecentRooms] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("codesync_recent_rooms") || "[]");
    } catch {
      return [];
    }
  });

  const activeDisplayName = user ? user.username : userName;

  const saveRecentRoom = (slug: string) => {
    try {
      const updated = [slug, ...recentRooms.filter((s) => s !== slug)].slice(0, 8);
      setRecentRooms(updated);
      localStorage.setItem("codesync_recent_rooms", JSON.stringify(updated));
    } catch {}
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem("codesync_user", activeDisplayName);
      const res = await authFetch("/api/rooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${activeDisplayName}'s Workspace`, language: "python" }),
      });
      if (!res.ok) {
        let errorDetail = "";
        try {
          const errData = await res.json();
          errorDetail = errData.detail || errData.error || (typeof errData === "object" ? JSON.stringify(errData) : "");
        } catch {
          try {
            errorDetail = await res.text();
          } catch {}
        }
        throw new Error(errorDetail || `Failed to create workspace (HTTP ${res.status}: ${res.statusText || "Server Error"})`);
      }
      const data = await res.json();
      saveRecentRoom(data.slug);
      onJoinRoom(data.slug, activeDisplayName);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomSlug.trim()) return;
    const cleanSlug = roomSlug.trim().replace(/^.*[?&]room=/, "");
    localStorage.setItem("codesync_user", activeDisplayName);
    saveRecentRoom(cleanSlug);
    onJoinRoom(cleanSlug, activeDisplayName);
  };

  return (
    <div className="min-h-screen flex flex-col bg-vscode-editor text-vscode-text font-sans select-none">
      {/* Top TitleBar / Header */}
      <header className="h-9 bg-vscode-toolbar border-b border-vscode-border px-4 flex items-center justify-between text-xs z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#007acc] flex items-center justify-center text-white font-mono text-[10px] font-bold">
            CS
          </div>
          <span className="font-semibold text-vscode-text tracking-tight">CodeSync</span>
          <span className="text-vscode-muted text-[11px] hidden sm:inline">&mdash; Collaborative Cloud IDE</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
          </button>

          {/* User Auth Pill */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 bg-vscode-sidebar border border-vscode-border rounded px-2.5 py-1 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-[#007acc]" />
              <span className="font-medium text-vscode-text">{user.username}</span>
              <button
                onClick={() => logout()}
                className="ml-1 text-vscode-muted hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-vscode-hover hover:bg-vscode-hover/80 border border-vscode-border text-vscode-text px-2.5 py-1 rounded transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[#007acc]" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Welcome Container */}
      <main className="flex-1 overflow-y-auto px-6 py-10 max-w-5xl mx-auto w-full flex flex-col justify-between">
        <div className="space-y-8">
          {/* Welcome Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-light text-vscode-text tracking-tight">
              CodeSync <span className="font-semibold">Collaborative IDE</span>
            </h1>
            <p className="text-xs sm:text-sm text-vscode-muted">
              Real-time multi-user editing with Yjs CRDT synchronization and air-gapped sandboxed code execution.
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded font-mono">
              {error}
            </div>
          )}

          {/* Two-Column Workbench Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Left Column: Start */}
            <div className="space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-vscode-muted flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#007acc]" />
                Start
              </h2>

              <div className="space-y-3">
                {/* Display Name Input */}
                <div>
                  <label className="block text-[11px] font-medium text-vscode-muted mb-1">
                    Your Developer Handle
                  </label>
                  <input
                    type="text"
                    value={activeDisplayName}
                    disabled={isAuthenticated}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name or handle"
                    className="w-full bg-vscode-input border border-vscode-border rounded px-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc] disabled:opacity-60"
                  />
                </div>

                {/* Create Room Button */}
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>{loading ? "Initializing Workspace..." : "Create New Collaborative Workspace"}</span>
                </button>

                {/* Join Existing Workspace Form */}
                <div className="pt-2">
                  <label className="block text-[11px] font-medium text-vscode-muted mb-1">
                    Join Workspace by Slug or URL
                  </label>
                  <form onSubmit={handleJoinExisting} className="flex gap-2">
                    <input
                      type="text"
                      value={roomSlug}
                      onChange={(e) => setRoomSlug(e.target.value)}
                      placeholder="Paste room slug (e.g. bold-tiger-42)"
                      className="flex-1 bg-vscode-input border border-vscode-border rounded px-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
                    />
                    <button
                      type="submit"
                      disabled={!roomSlug.trim()}
                      className="flex items-center justify-center px-3 bg-vscode-hover hover:bg-vscode-hover/80 text-vscode-text font-medium rounded border border-vscode-border text-xs transition-colors disabled:opacity-50"
                      title="Join Workspace"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column: Recent Workspaces */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-vscode-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#007acc]" />
                Recent Workspaces
              </h2>

              {recentRooms.length > 0 ? (
                <div className="space-y-1.5">
                  {recentRooms.map((slug) => (
                    <button
                      key={slug}
                      onClick={() => {
                        saveRecentRoom(slug);
                        onJoinRoom(slug, activeDisplayName);
                      }}
                      className="w-full text-left px-3 py-2 rounded bg-vscode-sidebar hover:bg-vscode-hover border border-vscode-border transition-colors flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Code2 className="w-3.5 h-3.5 text-[#007acc] flex-shrink-0" />
                        <span className="font-mono text-vscode-text truncate">#{slug}</span>
                      </div>
                      <span className="text-[11px] text-vscode-muted group-hover:text-vscode-text flex items-center gap-1">
                        Open &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded border border-vscode-border bg-vscode-sidebar/50 text-center text-xs text-vscode-muted">
                  No recent workspaces found. Create a workspace or join via invite link.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Specs Strip */}
        <div className="mt-12 pt-6 border-t border-vscode-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded bg-vscode-sidebar border border-vscode-border space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-vscode-text">
              <Terminal className="w-3.5 h-3.5 text-[#007acc]" />
              <span>Multi-Language Sandbox</span>
            </div>
            <p className="text-[11px] text-vscode-muted leading-relaxed">
              Execute Python 3.12, Node.js 20, and C++20 with real-time streaming chunks in isolated containers.
            </p>
          </div>

          <div className="p-3 rounded bg-vscode-sidebar border border-vscode-border space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-vscode-text">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Air-Gapped Isolation</span>
            </div>
            <p className="text-[11px] text-vscode-muted leading-relaxed">
              Zero network access (`network_mode=&quot;none&quot;`), 128MB RAM limit, 10s CPU timeout, and non-persistent tmpfs.
            </p>
          </div>

          <div className="p-3 rounded bg-vscode-sidebar border border-vscode-border space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-vscode-text">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Traceback Diagnosis</span>
            </div>
            <p className="text-[11px] text-vscode-muted leading-relaxed">
              Automated root cause analysis and one-click copyable bug fixes powered by Gemini AI.
            </p>
          </div>
        </div>
      </main>

      {/* VS Code Status Bar */}
      <footer className="h-[22px] bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] select-none flex-shrink-0 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[10px]">&gt;&lt;</span>
          <span>CodeSync: Ready</span>
        </div>
        <div className="flex items-center gap-3 text-white/90">
          <span>v0.1.0</span>
          <span>Yjs CRDT</span>
          <span>Docker Sandbox</span>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default HomePage;
