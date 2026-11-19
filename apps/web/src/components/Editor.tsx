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
  onCursorChange?: (line: number, column: number) => void;
  onMount?: (editorInstance: editor.IStandaloneCodeEditor) => void;
}

export const Editor: React.FC<EditorProps> = ({
  doc,
  provider,
  language,
  readOnly = false,
  onCursorChange,
  onMount,
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const cursorListenerRef = useRef<{ dispose: () => void } | null>(null);
  const onCursorChangeRef = useRef(onCursorChange);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  const handleEditorDidMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
    setEditorReady(true);
    onMount?.(editorInstance);

    // Track cursor movements for the status bar without stale closures
    if (cursorListenerRef.current) {
      cursorListenerRef.current.dispose();
    }
    cursorListenerRef.current = editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current?.(e.position.lineNumber, e.position.column);
    });
  };

  useEffect(() => {
    return () => {
      if (cursorListenerRef.current) {
        cursorListenerRef.current.dispose();
        cursorListenerRef.current = null;
      }
    };
  }, []);

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
    <div className="relative w-full h-full overflow-hidden bg-vscode-editor">
      <MonacoEditor
        height="100%"
        width="100%"
        language={language === "cpp" ? "cpp" : language}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        options={{
          readOnly,
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: true, side: "right" },
          smoothScrolling: true,
          cursorBlinking: readOnly ? "solid" : "smooth",
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "all",
          scrollBeyondLastLine: false,
          fixedOverflowWidgets: true,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default Editor;
