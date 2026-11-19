import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, ShieldAlert, LogIn } from "lucide-react";
import { createYjsSession, YjsSession } from "../lib/yjsClient";
import { getUserColor } from "../lib/colors";
import { resolveApiUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import Editor from "../components/Editor";
import TitleBar from "../components/ide/TitleBar";
import ActivityBar, { ActivityBarTab } from "../components/ide/ActivityBar";
import Sidebar, { ConnectedUser } from "../components/ide/Sidebar";
import EditorTabs from "../components/ide/EditorTabs";
import Breadcrumbs from "../components/ide/Breadcrumbs";
import BottomPanel, { BottomPanelTab } from "../components/ide/BottomPanel";
import StatusBar from "../components/ide/StatusBar";
import type { editor } from "monaco-editor";
import ShareModal from "../components/ShareModal";
import AuthModal from "../components/AuthModal";
import RunHistoryModal from "../components/RunHistoryModal";
import ShortcutsModal from "../components/ShortcutsModal";
import { RunStatus } from "../components/OutputPanel";

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

  // IDE Layout state
  const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActivityBarTab>("explorer");
  const [bottomPanelOpen, setBottomPanelOpen] = useState<boolean>(false);
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>("terminal");
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorColumn, setCursorColumn] = useState<number>(1);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  // Sandboxed Code Execution states
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

  // Fetch room metadata from backend
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
  }, [roomSlug, queryTokens, accessToken, authFetch]);

  // Create Yjs doc & provider session ONLY after room is verified and room.slug is available!
  const [session, setSession] = useState<YjsSession | null>(null);

  useEffect(() => {
    if (!room?.slug) return;

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
    user,
  ]);

  // Sync Language with Yjs Doc
  useEffect(() => {
    if (!session?.doc) return;
    const metaMap = session.doc.getMap("room-meta");

    if (!metaMap.get("language") && room?.language && room.current_user_role !== "viewer") {
      metaMap.set("language", room.language);
    } else if (metaMap.get("language")) {
      setCurrentLanguage(metaMap.get("language") as string);
    }

    const observer = () => {
      const lang = (metaMap.get("language") as string) || "python";
      setCurrentLanguage(lang);
    };

    metaMap.observe(observer);
    return () => {
      metaMap.unobserve(observer);
    };
  }, [session?.doc, room?.language, room?.current_user_role]);

  // Awareness & Remote Cursor CSS management
  useEffect(() => {
    if (!session?.provider) return;
    const awareness = session.provider.awareness;
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const userList: ConnectedUser[] = [];
      const styleId = "yjs-dynamic-cursors";
      let dynamicCss = "";

      states.forEach((state, clientId) => {
        if (state.user) {
          const u = state.user as { name?: string; color?: string; colorLight?: string };
          const name = u.name || `User ${clientId}`;
          const color = u.color || "#007acc";
          const colorLight = u.colorLight || "rgba(0, 122, 204, 0.25)";

          userList.push({
            clientId,
            name,
            color,
            isSelf: name === activeDisplayName,
          });

          dynamicCss += `
            .yRemoteSelection-${clientId} {
              background-color: ${colorLight} !important;
            }
            .yRemoteSelectionHead-${clientId} {
              border-left: 2px solid ${color} !important;
              background-color: ${color} !important;
            }
            .yRemoteSelectionHead-${clientId}::after {
              content: "${name}";
              background-color: ${color} !important;
              color: #ffffff !important;
              font-family: inherit;
              box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            }
          `;
        }
      });

      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = dynamicCss;

      setConnectedUsers(userList);
    };

    updateUsers();
    awareness.on("change", updateUsers);

    return () => {
      awareness.off("change", updateUsers);
      const styleEl = document.getElementById("yjs-dynamic-cursors");
      if (styleEl) styleEl.remove();
    };
  }, [session?.provider, activeDisplayName]);

  const handleLanguageChange = useCallback((newLang: string) => {
    if (room?.current_user_role === "viewer" || !session?.doc) return;
    const metaMap = session.doc.getMap("room-meta");
    metaMap.set("language", newLang);
    setCurrentLanguage(newLang);

    fetch(resolveApiUrl(`/api/rooms/${room?.slug || roomSlug}/`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLang }),
    }).catch((err) => {
      console.warn("Could not sync room language to backend API:", err);
    });
  }, [room?.current_user_role, room?.slug, roomSlug, session?.doc]);

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
          setBottomPanelOpen(true);
          setRunStatus("running");
          setRunOutput("");
          setRunDurationMs(null);
          setRunExitCode(null);
        } else if (data.type === "run_output") {
          setBottomPanelOpen(true);
          setRunStatus("running");
          setRunOutput((prev) => prev + (data.chunk || ""));
        } else if (data.type === "run_complete") {
          setBottomPanelOpen(true);
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

  // Polling fallback
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
      setBottomPanelOpen(true);
      setRunOutput("Cannot execute empty code.\n");
      setRunStatus("failed");
      return;
    }

    setBottomPanelOpen(true);
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

  const handleSaveSnapshot = useCallback(() => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }, []);

  const handleOpenProblems = useCallback(() => {
    setBottomPanelTab("problems");
    setBottomPanelOpen(true);
  }, []);

  const handleOpenSandbox = useCallback(() => {
    setActiveSidebarTab("run");
    setSidebarOpen(true);
  }, []);

  const handleTriggerFind = useCallback(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.focus();
      editorInstanceRef.current.getAction("actions.find")?.run();
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setBottomPanelOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveSnapshot();
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
  }, [handleRunCode, handleSaveSnapshot]);

  const hasExecutionError =
    runStatus === "failed" ||
    runStatus === "timeout" ||
    runStatus === "oom" ||
    (runStatus === "completed" && runExitCode !== null && runExitCode !== 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vscode-editor text-vscode-muted font-sans text-xs">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to CodeSync Workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    const isAccessDenied = error?.toLowerCase().includes("access denied");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-vscode-editor text-vscode-text gap-4 p-4 text-center font-sans">
        <div className="w-12 h-12 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-1">
          <p className="text-rose-400 font-semibold text-sm">{error || "Could not connect to session"}</p>
          {isAccessDenied && (
            <p className="text-xs text-vscode-muted">
              This room is private. You must sign in to an authorized account to collaborate, or use the read-only share link provided by the room owner.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {isAccessDenied && !user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign In / Register
            </button>
          )}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-3 py-1.5 bg-vscode-hover hover:bg-vscode-hover/80 border border-vscode-border rounded text-xs transition-colors text-vscode-text"
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-vscode-editor text-vscode-text select-none font-sans">
      {/* 1. VS Code Menu Bar / Title Bar */}
      <TitleBar
        roomName={room?.name || "CodeSync Room"}
        roomSlug={roomSlug}
        userRole={room?.current_user_role || "none"}
        activeFileName={getLanguageFileName(currentLanguage)}
        isExecuting={isExecuting}
        onRunCode={handleRunCode}
        onOpenShare={() => setShareModalOpen(true)}
        onOpenHistory={() => setRunHistoryOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onSaveSnapshot={handleSaveSnapshot}
        onLeaveRoom={onLeaveRoom}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onToggleBottomPanel={() => setBottomPanelOpen((prev) => !prev)}
        bottomPanelOpen={bottomPanelOpen}
        sidebarOpen={sidebarOpen}
      />

      {/* 2. Main IDE Middle Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Activity Bar (48px) */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={(tab) => {
            setActiveSidebarTab(tab);
            if (!sidebarOpen) setSidebarOpen(true);
          }}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          activeUsersCount={connectedUsers.length}
          isExecuting={isExecuting}
          hasError={hasExecutionError}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
        />

        {/* Primary Sidebar (Collapsible, 256px) */}
        <Sidebar
          activeTab={activeSidebarTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          roomName={room?.name || "CodeSync"}
          roomSlug={roomSlug}
          currentLanguage={currentLanguage}
          userRole={room?.current_user_role || "none"}
          connectedUsers={connectedUsers}
          isExecuting={isExecuting}
          onRunCode={handleRunCode}
          onOpenShare={() => setShareModalOpen(true)}
          onOpenHistory={() => setRunHistoryOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
          runStatus={runStatus}
          runExitCode={runExitCode}
          runDurationMs={runDurationMs}
          onSelectLanguage={handleLanguageChange}
          onTriggerFind={handleTriggerFind}
        />

        {/* Editor & Bottom Panel Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-vscode-editor">
          {/* Editor Tab Strip */}
          <EditorTabs
            currentLanguage={currentLanguage}
            isExecuting={isExecuting}
            isReadOnly={isReadOnly}
            onRunCode={handleRunCode}
            onSelectLanguage={handleLanguageChange}
            onToggleBottomPanel={() => setBottomPanelOpen((prev) => !prev)}
            onCloseTab={onLeaveRoom}
            bottomPanelOpen={bottomPanelOpen}
          />

          {/* Breadcrumbs */}
          <Breadcrumbs
            currentLanguage={currentLanguage}
            onSelectWorkspace={() => {
              setActiveSidebarTab("explorer");
              setSidebarOpen(true);
            }}
          />

          {/* Monaco Editor Canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <Editor
              doc={session.doc}
              provider={session.provider}
              language={currentLanguage}
              readOnly={isReadOnly}
              onMount={(inst) => {
                editorInstanceRef.current = inst;
              }}
              onCursorChange={(line, col) => {
                setCursorLine(line);
                setCursorColumn(col);
              }}
            />
          </div>

          {/* Integrated VS Code Bottom Panel */}
          <BottomPanel
            isOpen={bottomPanelOpen}
            onToggle={() => setBottomPanelOpen((prev) => !prev)}
            status={runStatus}
            output={runOutput}
            durationMs={runDurationMs}
            exitCode={runExitCode}
            onClear={() => setRunOutput("")}
            onExplainError={handleExplainError}
            isExplaining={isExplaining}
            explanationData={explanationData}
            onClearExplanation={() => setExplanationData(null)}
            onOpenHistoryModal={() => setRunHistoryOpen(true)}
            activeTab={bottomPanelTab}
            onSelectTab={setBottomPanelTab}
          />
        </div>
      </div>

      {/* 3. VS Code Status Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        cursorLine={cursorLine}
        cursorColumn={cursorColumn}
        currentLanguage={currentLanguage}
        hasError={hasExecutionError}
        isExecuting={isExecuting}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
        onOpenLanguagePicker={() => {
          setActiveSidebarTab("settings");
          setSidebarOpen(true);
        }}
        onOpenProblems={handleOpenProblems}
        onOpenSandbox={handleOpenSandbox}
      />

      {/* Modals */}
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
        <div className="fixed bottom-8 right-6 z-50 px-3 py-1.5 bg-[#007acc] text-white text-xs font-medium rounded shadow-xl flex items-center gap-2 border border-blue-400/40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>Snapshot saved to PostgreSQL</span>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
