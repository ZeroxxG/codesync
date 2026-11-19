import React from "react";
import { ChevronRight, FileCode, Folder } from "lucide-react";

interface BreadcrumbsProps {
  currentLanguage: string;
  onSelectWorkspace?: () => void;
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

const getLanguageIconColor = (lang: string) => {
  switch (lang.toLowerCase()) {
    case "javascript":
      return "text-yellow-400";
    case "cpp":
      return "text-blue-400";
    case "python":
    default:
      return "text-emerald-400";
  }
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentLanguage, onSelectWorkspace }) => {
  const fileName = getLanguageFileName(currentLanguage);

  return (
    <div className="h-[22px] px-3 bg-vscode-editor border-b border-vscode-border flex items-center text-[11px] text-vscode-muted select-none flex-shrink-0">
      <button
        onClick={onSelectWorkspace}
        className="hover:text-vscode-text cursor-pointer transition-colors bg-transparent p-0 text-inherit text-[11px]"
        title="Show in Explorer"
      >
        codesync
      </button>
      <ChevronRight className="w-3 h-3 mx-1 text-vscode-muted/70 flex-shrink-0" />
      <button
        onClick={onSelectWorkspace}
        className="flex items-center gap-1 hover:text-vscode-text cursor-pointer transition-colors bg-transparent p-0 text-inherit text-[11px]"
        title="Workspace Source Directory"
      >
        <Folder className="w-3 h-3 text-[#007acc]" />
        <span>src</span>
      </button>
      <ChevronRight className="w-3 h-3 mx-1 text-vscode-muted/70 flex-shrink-0" />
      <div className="flex items-center gap-1 text-vscode-text font-medium cursor-default">
        <FileCode className={`w-3 h-3 ${getLanguageIconColor(currentLanguage)}`} />
        <span>{fileName}</span>
      </div>
    </div>
  );
};

export default Breadcrumbs;
