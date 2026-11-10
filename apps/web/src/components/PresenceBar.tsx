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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">Connected</span>;
      case "connecting":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/60 text-amber-300 border border-amber-700/50 animate-pulse">Connecting...</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-900/60 text-rose-300 border border-rose-700/50">Disconnected</span>;
    }
  };

  return (
    <div className="flex items-center gap-3">
      {getStatusBadge()}
      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 text-xs text-slate-300">
        <Users className="w-3.5 h-3.5 text-slate-400" />
        <span>{users.length} online</span>
        <div className="flex items-center -space-x-1 ml-1.5 overflow-hidden">
          {users.map((u) => {
            const isSelf = u.name === currentUserName;
            return (
              <div
                key={u.clientId}
                title={`${u.name}${isSelf ? " (you)" : ""}`}
                style={{ backgroundColor: u.color }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-900"
              >
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PresenceBar;
