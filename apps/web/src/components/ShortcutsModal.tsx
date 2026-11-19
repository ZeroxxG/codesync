import React, { useEffect } from "react";
import { X, Keyboard, Command } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "IDE & Execution Controls",
    shortcuts: [
      { keys: ["Ctrl", "↵ Enter"], description: "Run current code in isolated sandbox" },
      { keys: ["Ctrl", "B"], description: "Toggle Primary Sidebar open / closed" },
      { keys: ["Ctrl", "J"], description: "Toggle Bottom Terminal Panel open / closed" },
      { keys: ["Ctrl", "S"], description: "Force trigger document snapshot save to PostgreSQL" },
      { keys: ["Ctrl", "H"], description: "Toggle execution run history drawer" },
      { keys: ["?"], description: "Open this keyboard shortcuts dialog" },
      { keys: ["Esc"], description: "Close active modal, drawer, or dropdown" },
    ],
  },
  {
    title: "Monaco Editor Navigation & Editing",
    shortcuts: [
      { keys: ["Ctrl", "/"], description: "Toggle line comment" },
      { keys: ["Ctrl", "D"], description: "Add selection to next matching word" },
      { keys: ["Alt", "↑ / ↓"], description: "Move line up or down" },
      { keys: ["Shift", "Alt", "F"], description: "Format document" },
      { keys: ["Ctrl", "F"], description: "Find in editor" },
      { keys: ["Ctrl", "H"], description: "Replace in editor (when focused)" },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-vscode-sidebar border border-vscode-border rounded shadow-2xl flex flex-col overflow-hidden text-vscode-text font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-vscode-border bg-vscode-toolbar">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-[#007acc]" />
            <div>
              <h2 className="text-sm font-semibold text-vscode-text flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono font-normal text-vscode-muted bg-vscode-input px-1.5 py-0.5 rounded border border-vscode-border">
                  {isMac ? "macOS: Cmd" : "Windows/Linux: Ctrl"}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-vscode-muted hover:text-vscode-text hover:bg-vscode-hover transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-vscode-muted flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-[#007acc]" />
                {cat.title}
              </h3>
              <div className="divide-y divide-vscode-border rounded border border-vscode-border bg-vscode-panel overflow-hidden">
                {cat.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-vscode-hover transition-colors text-xs"
                  >
                    <span className="text-vscode-text">{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIdx) => {
                        const displayKey = isMac && k === "Ctrl" ? "⌘" : k;
                        return (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 rounded bg-vscode-sidebar border border-vscode-border text-[11px] font-mono font-medium text-vscode-text shadow-sm"
                          >
                            {displayKey}
                          </kbd>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-vscode-border bg-vscode-toolbar flex items-center justify-between text-xs text-vscode-muted">
          <span>Press <kbd className="px-1.5 py-0.5 bg-vscode-sidebar border border-vscode-border rounded text-vscode-text font-mono text-[10px]">Esc</kbd> to dismiss</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#007acc] hover:bg-[#0062a3] text-white transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
