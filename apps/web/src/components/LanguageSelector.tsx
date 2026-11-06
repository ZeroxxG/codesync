import React, { useEffect, useState } from "react";
import * as Y from "yjs";
import { Code2 } from "lucide-react";

interface LanguageSelectorProps {
  doc: Y.Doc;
  roomSlug: string;
  initialLanguage?: string;
  onLanguageChange?: (lang: string) => void;
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
}) => {
  const [currentLang, setCurrentLang] = useState<string>(initialLanguage);

  useEffect(() => {
    const metaMap = doc.getMap("room-meta");

    // Initialize map if unset
    if (!metaMap.get("language") && initialLanguage) {
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
  }, [doc, initialLanguage, onLanguageChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    const metaMap = doc.getMap("room-meta");
    metaMap.set("language", newLang);
    setCurrentLang(newLang);
    onLanguageChange?.(newLang);

    // Persist to Django API in background
    fetch(`/api/rooms/${roomSlug}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLang }),
    }).catch((err) => {
      console.warn("Could not sync room language to backend API:", err);
    });
  };

  return (
    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-md px-2.5 py-1 text-xs">
      <Code2 className="w-4 h-4 text-slate-400" />
      <span className="text-slate-400 font-medium">Language:</span>
      <select
        value={currentLang}
        onChange={handleChange}
        className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer border-none py-0 pl-1 pr-6"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id} className="bg-slate-900 text-slate-200">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
