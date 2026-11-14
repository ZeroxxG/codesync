import React, { useEffect, useRef, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useTheme } from "../contexts/ThemeContext";

interface EditorProps {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  language: string;
  readOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({ doc, provider, language, readOnly = false }) => {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
    setEditorReady(true);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly,
        cursorBlinking: readOnly ? "solid" : "smooth",
      });
    }
  }, [readOnly]);

  // Bind Monaco to Y.Doc "monaco" CRDT text once both are ready
  useEffect(() => {
    if (!editorReady || !editorRef.current || !doc || !provider) {
      return;
    }

    const editorInstance = editorRef.current;
    const model = editorInstance.getModel();
    if (!model) return;

    // Clean up any stale binding before re-attaching
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const yText = doc.getText("monaco");
    const awareness = provider.awareness;

    if (awareness) {
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorInstance]),
        awareness
      );
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [editorReady, doc, provider]);

  return (
    <div className={`relative w-full h-full min-h-[500px] border rounded-lg overflow-hidden transition-colors ${
      theme === "dark" ? "border-slate-800 bg-[#1e1e1e]" : "border-slate-300 bg-white shadow-sm"
    }`}>
      <MonacoEditor
        height="100%"
        language={language === "cpp" ? "cpp" : language}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          minimap: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: readOnly ? "solid" : "smooth",
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default Editor;
