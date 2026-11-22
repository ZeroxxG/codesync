import React, { useEffect, useState } from "react";
import * as Y from "yjs";
import { ChevronDown } from "lucide-react";
import { resolveApiUrl } from "../lib/api";

interface LanguageSelectorProps {
  doc: Y.Doc;
  roomSlug: string;
  initialLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  readOnly?: boolean;
}

const LANGUAGES = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript (Node.js)" },
  { id: "cpp", label: "C++ (GCC)" },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  doc,
  roomSlug,
  initialLanguage = "python",
  onLanguageChange,
  readOnly = false,
}) => {
  const [currentLang, setCurrentLang] = useState<string>(initialLanguage);

  useEffect(() => {
    const metaMap = doc.getMap("room-meta");

    // Initialize map if unset and user has write permissions
    if (!metaMap.get("language") && initialLanguage && !readOnly) {
      metaMap.set("language", initialLanguage);
    } else if (metaMap.get("language")) {
      const existing = metaMap.get("language") as string;
      setCurrentLang(existing);
      onLanguageChange?.(existing);
    }

    const observer = () => {
      const lang = (metaMap.get("language") as string) || "python";
      setCurrentLang(lang);
      onLanguageChange?.(lang);
    };

    metaMap.observe(observer);
    return () => {
      metaMap.unobserve(observer);
    };
  }, [doc, initialLanguage, onLanguageChange, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    const newLang = e.target.value;
    const metaMap = doc.getMap("room-meta");
    metaMap.set("language", newLang);
    setCurrentLang(newLang);
    onLanguageChange?.(newLang);

    // Persist to Django API in background
    fetch(resolveApiUrl(`/api/rooms/${roomSlug}/`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLang }),
    }).catch((err) => {
      console.warn("Could not sync room language to backend API:", err);
    });
  };

  const active = LANGUAGES.find((l) => l.id === currentLang) || LANGUAGES[0];

  return (
    <div
      className={`relative flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs ${
        readOnly ? "opacity-70" : ""
      }`}
      title={readOnly ? "Read-only access" : "Change room language"}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        lang
      </span>
      <select
        value={currentLang}
        onChange={handleChange}
        disabled={readOnly}
        className={`cursor-pointer appearance-none bg-transparent pr-5 font-mono text-[11px] font-medium text-fg focus:outline-none ${
          readOnly ? "cursor-not-allowed text-muted" : ""
        }`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id} className="bg-surface text-fg">
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-muted" />
      <span className="sr-only">{active.label}</span>
    </div>
  );
};

export default LanguageSelector;
