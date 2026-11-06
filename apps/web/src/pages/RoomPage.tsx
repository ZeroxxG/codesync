import React, { useEffect, useState, useMemo } from "react";
import { Copy, Check, Terminal, Play, ArrowLeft } from "lucide-react";
import { createYjsSession, YjsSession } from "../lib/yjsClient";
import { getUserColor } from "../lib/colors";
import Editor from "../components/Editor";
import PresenceBar from "../components/PresenceBar";
import LanguageSelector from "../components/LanguageSelector";

interface RoomPageProps {
  roomSlug: string;
  userName: string;
  onLeaveRoom: () => void;
}

interface RoomData {
  id: string;
  name: string;
  slug: string;
  language: string;
}

export const RoomPage: React.FC<RoomPageProps> = ({
  roomSlug,
  userName,
  onLeaveRoom,
}) => {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("python");
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting");
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const userColor = useMemo(() => getUserColor(userName), [userName]);

  // Fetch room metadata from Django
  useEffect(() => {
    let mounted = true;
    fetch(`/api/rooms/${roomSlug}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Room not found");
        return res.json();
      })
      .then((data: RoomData) => {
        if (mounted) {
          setRoom(data);
          setCurrentLanguage(data.language || "python");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [roomSlug]);

  // Create Yjs doc & provider session
  const [session, setSession] = useState<YjsSession | null>(null);

  useEffect(() => {
    const s = createYjsSession({
      roomSlug,
      userName,
      userColor,
      onStatusChange: (status) => setConnectionStatus(status),
    });
    setSession(s);

    return () => {
      s.destroy();
    };
  }, [roomSlug, userName, userColor]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading room...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-4">
        <p className="text-rose-400 font-semibold">{error || "Could not connect to session"}</p>
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Leave room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              {room?.name || "CodeSync Room"}
              <span className="text-[11px] font-mono font-normal text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                #{roomSlug}
              </span>
            </h1>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          <LanguageSelector
            doc={session.doc}
            roomSlug={roomSlug}
            initialLanguage={room?.language || "python"}
            onLanguageChange={(lang) => setCurrentLanguage(lang)}
          />

          <PresenceBar
            provider={session.provider}
            currentUserName={userName}
            connectionStatus={connectionStatus}
          />

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-md font-medium text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Share Link"}</span>
          </button>

          <button
            disabled
            title="Code execution enabled in Phase 3"
            className="flex items-center gap-1.5 text-xs bg-emerald-600/50 cursor-not-allowed opacity-60 text-white px-3 py-1.5 rounded-md font-semibold"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <main className="flex-1 p-3 overflow-hidden">
        <Editor
          doc={session.doc}
          provider={session.provider}
          language={currentLanguage}
        />
      </main>
    </div>
  );
};

export default RoomPage;
