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
    title: "Application & Execution",
    shortcuts: [
      { keys: ["Ctrl", "↵ Enter"], description: "Run current code in isolated sandbox" },
      { keys: ["Ctrl", "S"], description: "Force trigger document snapshot save" },
      { keys: ["Ctrl", "H"], description: "Toggle execution run history drawer" },
      { keys: ["?"], description: "Open this keyboard shortcuts dialog" },
      { keys: ["Esc"], description: "Close any open dialog, modal, or drawer" },
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
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  {isMac ? "macOS: Cmd" : "Windows/Linux: Ctrl"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Boost your productivity with quick hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-blue-400" />
                {cat.title}
              </h3>
              <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
                {cat.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/30 transition-colors text-xs"
                  >
                    <span className="text-slate-300 font-medium">{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIdx) => {
                        const displayKey = isMac && k === "Ctrl" ? "⌘" : k;
                        return (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-200 shadow-sm"
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
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> to dismiss</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
