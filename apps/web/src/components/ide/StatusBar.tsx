import React from "react";
import {
  Loader2,
  AlertCircle,
  HelpCircle,
  Radio,
} from "lucide-react";

interface StatusBarProps {
  connectionStatus: string;
  cursorLine: number;
  cursorColumn: number;
  currentLanguage: string;
  hasError: boolean;
  isExecuting: boolean;
  onOpenShortcuts: () => void;
  onOpenLanguagePicker?: () => void;
  onOpenProblems?: () => void;
  onOpenSandbox?: () => void;
}

const getLanguageDisplayName = (lang: string) => {
  switch (lang.toLowerCase()) {
    case "javascript":
      return "JavaScript";
    case "cpp":
      return "C++";
    case "python":
    default:
      return "Python";
  }
};

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  cursorLine,
  cursorColumn,
  currentLanguage,
  hasError,
  isExecuting,
  onOpenShortcuts,
  onOpenLanguagePicker,
  onOpenProblems,
  onOpenSandbox,
}) => {
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  return (
    <footer
      className="h-[22px] bg-[#007acc] text-white flex items-center justify-between px-2 text-[11px] select-none z-30 flex-shrink-0 font-sans"
      aria-label="Status Bar"
    >
      {/* Left: Remote indicator & Connection / Problems */}
      <div className="flex items-center h-full gap-2">
        {/* Remote Host Pill (VS Code style) */}
        <button
          onClick={onOpenSandbox}
          className="h-full bg-[#005999] hover:bg-[#004d80] px-2 flex items-center gap-1.5 cursor-pointer font-medium tracking-tight text-white border-none"
          title="Sandbox Container Specifications (Click to inspect in sidebar)"
        >
          <span className="font-mono font-bold text-[10px]">&gt;&lt;</span>
          <span>CodeSync: Sandbox</span>
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1 text-white/90 hover:text-white cursor-default">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              <span className="hidden sm:inline">Connected</span>
            </>
          ) : isConnecting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Problems Badge */}
        <button
          onClick={onOpenProblems}
          className="flex items-center gap-1 text-white/90 hover:text-white cursor-pointer px-1 bg-transparent border-none text-[11px]"
          title="Problems Panel (Click to view output diagnostics)"
        >
          <AlertCircle className="w-3 h-3" />
          <span>{hasError ? "1 Error" : "0"}</span>
        </button>

        {/* Executing status indicator */}
        {isExecuting && (
          <div className="flex items-center gap-1 text-amber-200 animate-pulse font-mono text-[10px]">
            <Radio className="w-3 h-3 animate-spin" />
            <span>Runner Active</span>
          </div>
        )}
      </div>

      {/* Right: Cursor, Formatting, Language, Actions */}
      <div className="flex items-center h-full gap-3 text-white/90">
        {/* Line & Column Coordinates */}
        <div className="hover:text-white cursor-default px-1 font-mono" title="Cursor Line and Column position">
          Ln {cursorLine}, Col {cursorColumn}
        </div>

        {/* Indentation */}
        <div className="hidden md:inline-block text-white/90 cursor-default px-1" title="Indentation: 4 Spaces (Monaco tab size)">
          Spaces: 4
        </div>

        {/* Encoding */}
        <div className="hidden md:inline-block text-white/90 cursor-default px-1" title="Encoding: UTF-8">
          UTF-8
        </div>

        {/* End of Line */}
        <div className="hidden lg:inline-block text-white/90 cursor-default px-1" title="End of Line: LF">
          LF
        </div>

        {/* Language Mode */}
        <button
          onClick={onOpenLanguagePicker}
          className="hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-medium"
          title="Select Language Mode"
        >
          {getLanguageDisplayName(currentLanguage)}
        </button>

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="hover:text-white hover:bg-white/10 p-0.5 rounded cursor-pointer"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};

export default StatusBar;
