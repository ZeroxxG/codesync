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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-shell flex max-w-xl flex-col">
        {/* Header */}
        <div className="modal-head">
          <div className="flex items-center gap-3">
            <div className="icon-tile h-9 w-9">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-fg">Keyboard shortcuts</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {isMac ? "macOS · ⌘" : "Windows / Linux · Ctrl"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5 sm:p-6">
          {SHORTCUT_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <Command className="h-3 w-3 text-accentText" />
                {cat.title}
              </h3>
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-canvas">
                {cat.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[12px] transition-colors hover:bg-raised/60"
                  >
                    <span className="text-fg">{sc.description}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {sc.keys.map((k, kIdx) => {
                        const displayKey = isMac && k === "Ctrl" ? "⌘" : k;
                        return (
                          <kbd key={kIdx} className="kbd">
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
        <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="kbd !text-[10px]">Esc</kbd> dismiss
          </span>
          <button onClick={onClose} className="btn-quiet !px-3 !py-1.5 !text-[11px]">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
