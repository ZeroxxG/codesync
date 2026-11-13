import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface CreateYjsSessionOptions {
  roomSlug: string;
  userName: string;
  userColor: { color: string; light: string };
  token?: string | null;
  viewerToken?: string | null;
  onStatusChange?: (status: string) => void;
}

export interface YjsSession {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  destroy: () => void;
}

export function createYjsSession(options: CreateYjsSessionOptions): YjsSession {
  const { roomSlug, userName, userColor, token, viewerToken, onStatusChange } = options;

  const doc = new Y.Doc();

  const realtimeUrl =
    (import.meta as any).env?.VITE_REALTIME_URL ||
    `ws://${window.location.hostname}:1234`;

  const parameters: Record<string, string> = {
    user: userName,
  };
  if (token) parameters.token = token;
  if (viewerToken) parameters.viewer_token = viewerToken;

  const provider = new HocuspocusProvider({
    url: realtimeUrl,
    name: roomSlug,
    document: doc,
    parameters,
    onStatus: ({ status }) => {
      onStatusChange?.(status);
    },
  });

  // Set initial awareness state for cursors & presence
  if (provider.awareness) {
    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor.color,
      colorLight: userColor.light,
    });
  }

  return {
    doc,
    provider,
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}
