import React, { useEffect, useRef } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

interface EditorProps {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  language: string;
  readOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({ doc, provider, language, readOnly = false }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;

    const yText = doc.getText("monaco");
    const model = editorInstance.getModel();

    if (model && provider.awareness) {
      // Bind Yjs CRDT model with Monaco editor
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorInstance]),
        provider.awareness
      );
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly,
        cursorBlinking: readOnly ? "solid" : "smooth",
      });
    }
  }, [readOnly]);

  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] border border-slate-800 rounded-lg overflow-hidden bg-[#1e1e1e]">
      <MonacoEditor
        height="100%"
        language={language === "cpp" ? "cpp" : language}
        theme="vs-dark"
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
