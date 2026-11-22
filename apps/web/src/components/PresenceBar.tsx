import React, { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Users } from "lucide-react";

interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}

interface PresenceBarProps {
  provider: HocuspocusProvider;
  currentUserName: string;
  connectionStatus: string;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({
  provider,
  currentUserName,
  connectionStatus,
}) => {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const userList: PresenceUser[] = [];
      const styleId = "yjs-dynamic-cursors";

      let dynamicCss = "";

      states.forEach((state, clientId) => {
        if (state.user) {
          const user = state.user as { name?: string; color?: string; colorLight?: string };
          const name = user.name || `User ${clientId}`;
          const color = user.color || "#3b82f6";
          const colorLight = user.colorLight || "rgba(59, 130, 246, 0.25)";

          userList.push({
            clientId,
            name,
            color,
          });

          // Dynamic CSS for Monaco cursors for this specific client
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

      // Update stylesheet in head
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = dynamicCss;

      setUsers(userList);
    };

    updateUsers();
    awareness.on("change", updateUsers);

    return () => {
      awareness.off("change", updateUsers);
      const styleEl = document.getElementById("yjs-dynamic-cursors");
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, [provider]);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="hidden sm:inline">Live</span>
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Linking</span>
          </span>
        );
      default:
        return (
          <span
            title="Realtime collaboration server is unreachable. Check that apps/realtime (port 1234) and apps/api (port 8000) are running."
            className="inline-flex cursor-help items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-rose-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        );
    }
  };

  const isConnected = connectionStatus === "connected";

  return (
    <div className="flex items-center gap-2.5">
      {getStatusBadge()}
      <div
        className={`flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg transition-opacity ${
          !isConnected ? "opacity-60" : ""
        }`}
      >
        <Users className="w-3.5 h-3.5 text-muted" />
        <span className="font-mono text-[11px] tabular-nums">
          {isConnected
            ? users.length
            : connectionStatus === "connecting"
            ? "…"
            : "–"}
        </span>
        {isConnected && users.length > 0 && (
          <div className="ml-0.5 flex items-center -space-x-1 overflow-hidden">
            {users.slice(0, 5).map((u) => {
              const isSelf = u.name === currentUserName;
              return (
                <div
                  key={u.clientId}
                  title={`${u.name}${isSelf ? " (you)" : ""}`}
                  style={{ backgroundColor: u.color }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ring-2 ring-surface"
                >
                  {u.name.slice(0, 1).toUpperCase()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceBar;
