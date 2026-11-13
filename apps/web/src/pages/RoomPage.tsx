import React, { useEffect, useState, useMemo } from "react";
import { Play, ArrowLeft, Share2, Eye, ShieldAlert, ShieldCheck, LogIn } from "lucide-react";
import { createYjsSession, YjsSession } from "../lib/yjsClient";
import { getUserColor } from "../lib/colors";
import { useAuth } from "../contexts/AuthContext";
import Editor from "../components/Editor";
import PresenceBar from "../components/PresenceBar";
import LanguageSelector from "../components/LanguageSelector";
import ShareModal from "../components/ShareModal";
import AuthModal from "../components/AuthModal";

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
  current_user_role: "owner" | "editor" | "viewer" | "none";
  owner_username?: string;
  viewer_token?: string;
  editor_token?: string;
}

export const RoomPage: React.FC<RoomPageProps> = ({
  roomSlug,
  userName,
  onLeaveRoom,
}) => {
  const { user, accessToken, authFetch } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("python");
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting");
  const [viewerToken, setViewerToken] = useState<string | undefined>(undefined);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract all query tokens
  const queryTokens = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const viewerToken = params.get("viewer_token") || undefined;
    const editorToken = params.get("editor_token") || undefined;
    const generalToken = params.get("token") || params.get("invite") || params.get("invite_token") || undefined;
    return { viewerToken, editorToken, generalToken };
  }, []);

  const activeDisplayName = user ? user.username : userName;
  const userColor = useMemo(() => getUserColor(activeDisplayName), [activeDisplayName]);

  // Fetch room metadata from Django
  useEffect(() => {
    let mounted = true;
    const tokenQuery = queryTokens.viewerToken
      ? `viewer_token=${encodeURIComponent(queryTokens.viewerToken)}`
      : queryTokens.editorToken
      ? `editor_token=${encodeURIComponent(queryTokens.editorToken)}`
      : queryTokens.generalToken
      ? `token=${encodeURIComponent(queryTokens.generalToken)}`
      : "";

    const url = `/api/rooms/${encodeURIComponent(roomSlug)}/${tokenQuery ? `?${tokenQuery}` : ""}`;

    authFetch(url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error("Access denied: You do not have permission to view this room.");
          throw new Error("Room not found");
        }
        return res.json();
      })
      .then((data: RoomData) => {
        if (mounted) {
          setRoom(data);
          setCurrentLanguage(data.language || "python");
          if (data.viewer_token) {
            setViewerToken(data.viewer_token);
          }
          if (roomSlug !== data.slug) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("room", data.slug);
            window.history.replaceState({}, "", newUrl.toString());
          }
          setError(null);
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
  }, [roomSlug, queryTokens, accessToken]);

  // Create Yjs doc & provider session ONLY after room is verified and room.slug is available!
  const [session, setSession] = useState<YjsSession | null>(null);

  useEffect(() => {
    if (!room?.slug) return;

    const effectiveViewer =
      viewerToken ||
      room.viewer_token ||
      queryTokens.viewerToken ||
      (room.current_user_role === "viewer" ? queryTokens.generalToken : undefined);

    const effectiveEditor =
      room.editor_token ||
      queryTokens.editorToken ||
      (room.current_user_role === "editor" ? queryTokens.generalToken : undefined);

    const s = createYjsSession({
      roomSlug: room.slug,
      userName: activeDisplayName,
      userColor,
      token: accessToken,
      viewerToken: effectiveViewer,
      editorToken: effectiveEditor,
      inviteToken: queryTokens.generalToken,
      onStatusChange: (status) => setConnectionStatus(status),
    });
    setSession(s);

    return () => {
      s.destroy();
    };
  }, [
    room?.slug,
    activeDisplayName,
    userColor,
    accessToken,
    viewerToken,
    queryTokens,
    room?.viewer_token,
    room?.editor_token,
    room?.current_user_role,
  ]);

  const handleRefreshViewerToken = async (): Promise<string> => {
    const res = await authFetch(`/api/rooms/${roomSlug}/viewer-link/`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to regenerate token");
    const data = await res.json();
    setViewerToken(data.viewer_token);
    return data.viewer_token;
  };

  const isReadOnly = room?.current_user_role === "viewer";
  const isOwner = room?.current_user_role === "owner";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading room session...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    const isAccessDenied = error?.toLowerCase().includes("access denied");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-4 p-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-1">
          <p className="text-rose-400 font-semibold">{error || "Could not connect to session"}</p>
          {isAccessDenied && (
            <p className="text-xs text-slate-400">
              This room is private. You must sign in to an authorized account to collaborate, or use the read-only share link provided by the room owner.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {isAccessDenied && !user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign In / Register
            </button>
          )}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
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
              {isReadOnly ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                  <Eye className="w-3 h-3" /> View Only
                </span>
              ) : isOwner ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" /> Owner
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Editor
                </span>
              )}
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
            readOnly={isReadOnly}
          />

          <PresenceBar
            provider={session.provider}
            currentUserName={activeDisplayName}
            connectionStatus={connectionStatus}
          />

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-md font-medium text-slate-300 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
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
          readOnly={isReadOnly}
        />
      </main>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        roomSlug={room?.slug || roomSlug}
        roomName={room?.name || "CodeSync"}
        viewerToken={viewerToken || room?.viewer_token || queryTokens.viewerToken}
        editorToken={room?.editor_token || queryTokens.editorToken}
        isOwner={isOwner}
        onRefreshViewerToken={isOwner ? handleRefreshViewerToken : undefined}
      />
    </div>
  );
};

export default RoomPage;
