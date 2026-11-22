import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Play, ArrowLeft, Share2, Eye, ShieldAlert, ShieldCheck, LogIn, Loader2, History, Sun, Moon, HelpCircle } from "lucide-react";
import { createYjsSession, YjsSession } from "../lib/yjsClient";
import { getUserColor } from "../lib/colors";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import Editor from "../components/Editor";
import PresenceBar from "../components/PresenceBar";
import LanguageSelector from "../components/LanguageSelector";
import ShareModal from "../components/ShareModal";
import AuthModal from "../components/AuthModal";
import OutputPanel, { RunStatus } from "../components/OutputPanel";
import RunHistoryModal from "../components/RunHistoryModal";
import ShortcutsModal from "../components/ShortcutsModal";

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
  const { theme, toggleTheme } = useTheme();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("python");
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting");
  const [viewerToken, setViewerToken] = useState<string | undefined>(undefined);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sandboxed Code Execution states
  const [outputPanelOpen, setOutputPanelOpen] = useState<boolean>(false);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runOutput, setRunOutput] = useState<string>("");
  const [runDurationMs, setRunDurationMs] = useState<number | null>(null);
  const [runExitCode, setRunExitCode] = useState<number | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explanationData, setExplanationData] = useState<{
    explanation: string;
    suggested_fix?: string;
    model?: string;
    is_ai?: boolean;
  } | null>(null);
  const [runHistoryOpen, setRunHistoryOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);


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

    // Authenticated members use JWT; guest tokens are only passed when accessing via shared link or as guest
    const isOwnerOrEditor = room.current_user_role === "owner" || (room.current_user_role === "editor" && Boolean(user));
    const effectiveViewer = queryTokens.viewerToken || (!isOwnerOrEditor ? viewerToken || room.viewer_token : undefined);
    const effectiveEditor = queryTokens.editorToken || (!isOwnerOrEditor ? room.editor_token : undefined);

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
  const isExecuting = runStatus === "running" || runStatus === "queued";

  // Listen for real-time execution stream over Hocuspocus stateless messages
  useEffect(() => {
    if (!session?.provider) return;

    const handleStateless = ({ payload }: { payload: string }) => {
      try {
        const data = JSON.parse(payload);
        if (data.room_slug && data.room_slug !== (room?.slug || roomSlug)) return;

        if (data.type === "run_start") {
          setOutputPanelOpen(true);
          setRunStatus("running");
          setRunOutput("");
          setRunDurationMs(null);
          setRunExitCode(null);
        } else if (data.type === "run_output") {
          setOutputPanelOpen(true);
          setRunStatus("running");
          setRunOutput((prev) => prev + (data.chunk || ""));
        } else if (data.type === "run_complete") {
          setOutputPanelOpen(true);
          setRunStatus(data.status || "completed");
          setRunExitCode(data.exit_code ?? 0);
          setRunDurationMs(data.duration_ms ?? null);
          if (data.output && !runOutput) {
            setRunOutput(data.output);
          }
          setActiveRunId(null);
        }
      } catch {
        // Ignore non-json stateless payloads
      }
    };

    session.provider.on("stateless", handleStateless);

    return () => {
      session.provider.off("stateless", handleStateless);
    };
  }, [session?.provider, room?.slug, roomSlug, runOutput]);

  // Polling fallback: if WebSocket drops or misses events while queued/running,
  // query Django REST API directly until a terminal status is returned.
  useEffect(() => {
    if (!activeRunId || (runStatus !== "queued" && runStatus !== "running")) {
      return;
    }

    const tokenQuery = queryTokens.editorToken
      ? `?editor_token=${encodeURIComponent(queryTokens.editorToken)}`
      : queryTokens.generalToken
        ? `?token=${encodeURIComponent(queryTokens.generalToken)}`
        : "";

    const interval = setInterval(async () => {
      try {
        const res = await authFetch(
          `/api/rooms/${encodeURIComponent(room?.slug || roomSlug)}/runs/${activeRunId}/${tokenQuery}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (
          data.status === "completed" ||
          data.status === "failed" ||
          data.status === "timeout" ||
          data.status === "oom"
        ) {
          setRunStatus(data.status);
          setRunExitCode(data.exit_code ?? 0);
          setRunDurationMs(data.duration_ms ?? null);
          if (data.output) {
            setRunOutput(data.output);
          }
          setActiveRunId(null);
        } else if (data.status === "running") {
          setRunStatus("running");
        }
      } catch {
        // Silently ignore polling network failures
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRunId, runStatus, room?.slug, roomSlug, queryTokens, authFetch]);

  const handleRunCode = useCallback(async () => {
    if (isReadOnly || isExecuting || !session?.doc) return;

    const codeText = session.doc.getText("monaco").toString();
    if (!codeText.trim()) {
      setOutputPanelOpen(true);
      setRunOutput("Cannot execute empty code.\n");
      setRunStatus("failed");
      return;
    }

    setOutputPanelOpen(true);
    setRunStatus("queued");
    setRunOutput("");
    setRunDurationMs(null);
    setRunExitCode(null);
    setActiveRunId(null);
    setExplanationData(null);

    const tokenQuery = queryTokens.editorToken
      ? `?editor_token=${encodeURIComponent(queryTokens.editorToken)}`
      : queryTokens.generalToken
        ? `?token=${encodeURIComponent(queryTokens.generalToken)}`
        : "";

    try {
      const res = await authFetch(
        `/api/rooms/${encodeURIComponent(room?.slug || roomSlug)}/runs/${tokenQuery}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: codeText,
            language: currentLanguage,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Execution failed with HTTP ${res.status}`;
        setRunStatus("failed");
        setRunOutput(`Error: ${msg}\n`);
        setActiveRunId(null);
        return;
      }

      const runData = await res.json();
      setRunStatus(runData.status || "queued");
      if (runData.id) {
        setActiveRunId(runData.id);
        setLastRunId(runData.id);
      }
    } catch (err: any) {
      setRunStatus("failed");
      setRunOutput(`Failed to trigger execution: ${err.message}\n`);
      setActiveRunId(null);
    }
  }, [
    isReadOnly,
    isExecuting,
    session?.doc,
    queryTokens,
    room?.slug,
    roomSlug,
    currentLanguage,
    authFetch,
  ]);

  const handleExplainError = useCallback(async () => {
    const targetRunId = lastRunId || activeRunId;
    if (!targetRunId || isExplaining) return;

    setIsExplaining(true);
    const tokenQuery = queryTokens.editorToken
      ? `?editor_token=${encodeURIComponent(queryTokens.editorToken)}`
      : queryTokens.viewerToken
        ? `?viewer_token=${encodeURIComponent(queryTokens.viewerToken)}`
        : queryTokens.generalToken
          ? `?token=${encodeURIComponent(queryTokens.generalToken)}`
          : "";

    try {
      const codeText = session?.doc ? session.doc.getText("monaco").toString() : "";
      const res = await authFetch(
        `/api/rooms/${encodeURIComponent(room?.slug || roomSlug)}/runs/${targetRunId}/explain/${tokenQuery}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeText }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Explanation failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      setExplanationData(data);
    } catch (err: any) {
      setExplanationData({
        explanation: `Unable to analyze error: ${err.message}`,
        model: "error",
      });
    } finally {
      setIsExplaining(false);
    }
  }, [lastRunId, activeRunId, isExplaining, queryTokens, room?.slug, roomSlug, session?.doc, authFetch]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setRunHistoryOpen((prev) => !prev);
      } else if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-muted">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs uppercase tracking-[0.14em]">Loading room session…</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    const isAccessDenied = error?.toLowerCase().includes("access denied");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-fg gap-4 p-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-1.5">
          <p className="text-rose-400 font-semibold font-display text-lg">
            {error || "Could not connect to session"}
          </p>
          {isAccessDenied && (
            <p className="text-xs leading-relaxed text-muted">
              This room is private. You must sign in to an authorized account to collaborate, or use the read-only share link provided by the room owner.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {isAccessDenied && !user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn-signal !text-xs"
            >
              <LogIn className="w-4 h-4" /> Sign in / Register
            </button>
          )}
          <button onClick={onLeaveRoom} className="btn-quiet !text-xs">
            <ArrowLeft className="w-4 h-4" /> Back to home
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
    <div className="flex flex-col h-screen bg-canvas text-fg overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-line bg-surface px-3 sm:px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg transition-colors"
            title="Leave room"
            aria-label="Leave room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-fg flex items-center gap-2">
              <span className="truncate max-w-[9rem] sm:max-w-none">{room?.name || "CodeSync Room"}</span>
              <span className="hidden sm:inline text-[10px] font-mono font-normal text-muted bg-raised px-1.5 py-0.5 rounded border border-line">
                #{roomSlug}
              </span>
              {isReadOnly ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded">
                  <Eye className="w-3 h-3" /> View
                </span>
              ) : isOwner ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] bg-accent/10 text-accentText border border-accent/25 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" /> Owner
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center text-[10px] font-semibold uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded">
                  Editor
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden md:flex items-center">
            <LanguageSelector
              doc={session.doc}
              roomSlug={roomSlug}
              initialLanguage={room?.language || "python"}
              onLanguageChange={(lang) => setCurrentLanguage(lang)}
              readOnly={isReadOnly}
            />
          </div>

          <PresenceBar
            provider={session.provider}
            currentUserName={activeDisplayName}
            connectionStatus={connectionStatus}
          />

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-lg border border-line text-muted hover:bg-raised hover:text-fg font-medium transition-colors"
            title="Share room"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Share</span>
          </button>

          <button
            onClick={() => setRunHistoryOpen(true)}
            title="Execution history"
            className="hidden sm:flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-lg border border-line text-muted hover:bg-raised hover:text-fg font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">History</span>
          </button>

          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShortcutsModalOpen(true)}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunCode}
            disabled={isReadOnly || isExecuting}
            title={
              isReadOnly
                ? "Viewers are not permitted to run code"
                : isExecuting
                  ? "Code execution in progress..."
                  : "Run code (Ctrl+Enter)"
            }
            className={`flex items-center gap-1.5 text-xs h-8 px-3 rounded-lg font-semibold transition-all ${
              isReadOnly
                ? "bg-raised text-muted cursor-not-allowed border border-line"
                : isExecuting
                  ? "bg-amber-500/20 text-amber-300 cursor-wait border border-amber-500/30"
                  : "bg-accent text-[#14180a] hover:brightness-105 active:scale-[0.98]"
            }`}
          >
            {isExecuting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isExecuting ? "Running" : "Run"}</span>
            {!isReadOnly && !isExecuting && (
              <span className="hidden lg:inline-block ml-0.5 font-mono text-[10px] text-[#14180a]/60">
                ⌘↵
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Editor & Output Body */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col">
        {/* Compact toolbar for small screens where the header controls collapse */}
        <div className="mb-2 flex items-center justify-between gap-2 md:hidden">
          <LanguageSelector
            doc={session.doc}
            roomSlug={roomSlug}
            initialLanguage={room?.language || "python"}
            onLanguageChange={(lang) => setCurrentLanguage(lang)}
            readOnly={isReadOnly}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRunHistoryOpen(true)}
              aria-label="Execution history"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg transition-colors"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg transition-colors sm:hidden"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShortcutsModalOpen(true)}
              aria-label="Keyboard shortcuts"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-raised hover:text-fg transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Editor
            doc={session.doc}
            provider={session.provider}
            language={currentLanguage}
            readOnly={isReadOnly}
          />
        </div>

        <OutputPanel
          isOpen={outputPanelOpen}
          onToggle={() => setOutputPanelOpen(!outputPanelOpen)}
          status={runStatus}
          output={runOutput}
          durationMs={runDurationMs}
          exitCode={runExitCode}
          onClear={() => setRunOutput("")}
          onExplainError={handleExplainError}
          isExplaining={isExplaining}
          explanationData={explanationData}
          onClearExplanation={() => setExplanationData(null)}
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

      <RunHistoryModal
        isOpen={runHistoryOpen}
        onClose={() => setRunHistoryOpen(false)}
        roomSlug={room?.slug || roomSlug}
        queryTokens={queryTokens}
        authFetch={authFetch}
      />

      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 bg-fg text-canvas text-xs font-semibold rounded-lg shadow-xl flex items-center gap-2 border border-line animate-pop-in">
          <span>Snapshot saved to PostgreSQL</span>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
