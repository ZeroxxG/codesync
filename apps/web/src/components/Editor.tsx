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
    <div className={`relative w-full h-full min-h-0 sm:min-h-[380px] rounded-xl overflow-hidden border transition-colors ${
      theme === "dark" ? "border-nightLine bg-[#0d0f12]" : "border-line bg-white"
    }`}>
      <MonacoEditor
        height="100%"
        language={language === "cpp" ? "cpp" : language}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: readOnly ? "solid" : "smooth",
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: "gutter",
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
        beforeMount={(monaco) => {
          // Keep the editor outline consistent with the CodeSync token palette.
          monaco.editor.defineTheme("codesync-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "6b7280", fontStyle: "italic" },
              { token: "keyword", foreground: "cbf24b" },
              { token: "string", foreground: "a9e88a" },
              { token: "number", foreground: "f0a3a3" },
            ],
            colors: {
              "editor.background": "#0d0f12",
              "editor.lineHighlightBackground": "#14171c",
              "editorLineNumber.foreground": "#4b5563",
              "editorLineNumber.activeForeground": "#cbf24b",
              "editorGutter.background": "#0d0f12",
              "editorCursor.foreground": "#cbf24b",
              "editorIndentGuide.background1": "#1e2329",
              "editor.selectionBackground": "#2b3a1e",
            },
          });
        }}
        theme={theme === "dark" ? "codesync-dark" : "vs"}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default Editor;
