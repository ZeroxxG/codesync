import React, { useState } from "react";
import { Code, Plus, ArrowRight, Sparkles } from "lucide-react";

interface HomePageProps {
  onJoinRoom: (slug: string, userName: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onJoinRoom }) => {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("codesync_user") || `Dev-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [roomSlug, setRoomSlug] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem("codesync_user", userName);
      const res = await fetch("/api/rooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${userName}'s Room`, language: "python" }),
      });
      if (!res.ok) {
        throw new Error(`Failed to create room: ${res.statusText}`);
      }
      const data = await res.json();
      onJoinRoom(data.slug, userName);
    } catch (err: any) {
      setError(err.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomSlug.trim()) return;
    localStorage.setItem("codesync_user", userName);
    onJoinRoom(roomSlug.trim(), userName);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      </div>
    </div>
  );
};

export default HomePage;
