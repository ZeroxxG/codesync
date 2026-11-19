import React from "react";
import {
  Files,
  Search,
  Play,
  Users,
  History,
  Keyboard,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export type ActivityBarTab =
  | "explorer"
  | "search"
  | "run"
  | "collab"
  | "history"
  | "settings";

interface ActivityBarProps {
  activeTab: ActivityBarTab;
  onSelectTab: (tab: ActivityBarTab) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeUsersCount?: number;
  isExecuting?: boolean;
  hasError?: boolean;
  onOpenShortcuts: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  sidebarOpen,
  onToggleSidebar,
  activeUsersCount = 1,
  isExecuting = false,
  hasError = false,
  onOpenShortcuts,
}) => {
  const { theme, toggleTheme } = useTheme();

  const handleTabClick = (tab: ActivityBarTab) => {
    if (activeTab === tab && sidebarOpen) {
      onToggleSidebar();
    } else {
      onSelectTab(tab);
      if (!sidebarOpen) {
        onToggleSidebar();
      }
    }
  };

  const navItems: { id: ActivityBarTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: "explorer",
      label: "Explorer (Ctrl+Shift+E)",
      icon: <Files className="w-5 h-5 stroke-[1.6]" />,
    },
    {
      id: "search",
      label: "Search (Ctrl+Shift+F)",
      icon: <Search className="w-5 h-5 stroke-[1.6]" />,
    },
    {
      id: "run",
      label: "Run & Sandbox (Ctrl+Shift+D)",
      icon: <Play className={`w-5 h-5 stroke-[1.6] ${isExecuting ? "text-amber-400 animate-pulse fill-amber-400/20" : ""}`} />,
      badge: isExecuting ? (
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-2" />
      ) : hasError ? (
        <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
      ) : null,
    },
    {
      id: "collab",
      label: "Collaboration & Peers",
      icon: <Users className="w-5 h-5 stroke-[1.6]" />,
      badge: activeUsersCount > 1 ? (
        <span className="absolute top-1.5 right-1 text-[9px] font-mono font-semibold bg-[#007acc] text-white rounded-full w-4 h-4 flex items-center justify-center">
          {activeUsersCount}
        </span>
      ) : null,
    },
    {
      id: "history",
      label: "Execution History (Ctrl+H)",
      icon: <History className="w-5 h-5 stroke-[1.6]" />,
    },
  ];

  return (
    <aside
      className="w-12 h-full bg-vscode-activity-bar border-r border-vscode-border flex flex-col justify-between items-center py-1 select-none z-20 flex-shrink-0"
      aria-label="Activity Bar"
    >
      {/* Top Main Navigation */}
      <div className="flex flex-col items-center w-full gap-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id && sidebarOpen;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              className={`relative w-full h-12 flex items-center justify-center transition-colors ${
                isActive
                  ? "text-vscode-text bg-vscode-sidebar/30 border-l-2 border-[#007acc]"
                  : "text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover/50 border-l-2 border-transparent"
              }`}
            >
              {item.icon}
              {item.badge}
            </button>
          );
        })}
      </div>

      {/* Bottom Utilities */}
      <div className="flex flex-col items-center w-full gap-0.5 pb-1">
        {/* Keyboard Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          className="w-full h-11 flex items-center justify-center text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover/50 border-l-2 border-transparent transition-colors"
        >
          <Keyboard className="w-5 h-5 stroke-[1.6]" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className="w-full h-11 flex items-center justify-center text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover/50 border-l-2 border-transparent transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 stroke-[1.6] text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 stroke-[1.6] text-blue-500" />
          )}
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => handleTabClick("settings")}
          title="Settings & Room Info"
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeTab === "settings" && sidebarOpen
              ? "text-vscode-text bg-vscode-sidebar/30 border-l-2 border-[#007acc]"
              : "text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover/50 border-l-2 border-transparent"
          }`}
        >
          <Settings className="w-5 h-5 stroke-[1.6]" />
        </button>
      </div>
    </aside>
  );
};

export default ActivityBar;
