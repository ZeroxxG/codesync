import React, { useState } from "react";
import { Code, Plus, ArrowRight, Sparkles, LogIn, LogOut, User as UserIcon, Sun, Moon } from "lucide-react";
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
    return localStorage.getItem("codesync_user") || `Dev-${Math.floor(100 + Math.random() * 900)}`;
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
      const updated = [slug, ...recentRooms.filter((s) => s !== slug)].slice(0, 5);
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
        body: JSON.stringify({ name: `${activeDisplayName}'s Room`, language: "python" }),
      });
      if (!res.ok) {
        throw new Error(`Failed to create room: ${res.statusText}`);
      }
      const data = await res.json();
      saveRecentRoom(data.slug);
      onJoinRoom(data.slug, activeDisplayName);
    } catch (err: any) {
      setError(err.message || "Failed to create room");
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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Top Auth & Theme Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <UserIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-white">{user.username}</span>
            <button
              onClick={() => logout()}
              className="ml-2 text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>

      <div className="max-w-md w-full space-y-8 bg-slate-900/60 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-2">
            <Code className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            CodeSync <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Real-time collaborative code editor with instant sync & presence.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Your Display Name
            </label>
            <input
              type="text"
              value={activeDisplayName}
              disabled={isAuthenticated}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Creating Room..." : "Create New Room"}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-slate-500">or join existing</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleJoinExisting} className="flex gap-2">
            <input
              type="text"
              value={roomSlug}
              onChange={(e) => setRoomSlug(e.target.value)}
              placeholder="Paste room slug or link"
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!roomSlug.trim()}
              className="flex items-center justify-center px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {recentRooms.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Recent Rooms</span>
              <div className="flex flex-wrap gap-1.5">
                {recentRooms.map((slug) => (
                  <button
                    key={slug}
                    onClick={() => {
                      saveRecentRoom(slug);
                      onJoinRoom(slug, activeDisplayName);
                    }}
                    className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 transition-colors"
                  >
                    #{slug}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default HomePage;
