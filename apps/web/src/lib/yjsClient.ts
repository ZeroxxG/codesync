import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface CreateYjsSessionOptions {
  roomSlug: string;
  userName: string;
  userColor: { color: string; light: string };
  onStatusChange?: (status: string) => void;
}

export interface YjsSession {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  destroy: () => void;
}

export function createYjsSession(options: CreateYjsSessionOptions): YjsSession {
  const { roomSlug, userName, userColor, onStatusChange } = options;

  const doc = new Y.Doc();

  const realtimeUrl =
    (import.meta as any).env?.VITE_REALTIME_URL ||
    `ws://${window.location.hostname}:1234`;

  const provider = new HocuspocusProvider({
    url: realtimeUrl,
    name: roomSlug,
    document: doc,
    parameters: {
      user: userName,
    },
    onStatus: ({ status }) => {
      onStatusChange?.(status);
    },
  });

  // Set initial awareness state for cursors & presence
  provider.awareness.setLocalStateField("user", {
    name: userName,
    color: userColor.color,
    colorLight: userColor.light,
  });

  return {
    doc,
    provider,
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}
