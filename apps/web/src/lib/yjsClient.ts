import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface CreateYjsSessionOptions {
  roomSlug: string;
  userName: string;
  userColor: { color: string; light: string };
  token?: string | null;
  viewerToken?: string | null;
  editorToken?: string | null;
  inviteToken?: string | null;
  onStatusChange?: (status: string) => void;
}

export interface YjsSession {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  destroy: () => void;
}

export function createYjsSession(options: CreateYjsSessionOptions): YjsSession {
  const {
    roomSlug,
    userName,
    userColor,
    token,
    viewerToken,
    editorToken,
    inviteToken,
    onStatusChange,
  } = options;

  const doc = new Y.Doc();

  const realtimeUrl =
    (import.meta as any).env?.VITE_REALTIME_URL ||
    `ws://${window.location.hostname}:1234`;

  const parameters: Record<string, string> = {
    user: userName,
  };
  if (token) parameters.token = token;
  if (viewerToken) parameters.viewer_token = viewerToken;
  if (editorToken) parameters.editor_token = editorToken;
  if (inviteToken) parameters.invite_token = inviteToken;

  const provider = new HocuspocusProvider({
    url: realtimeUrl,
    name: roomSlug,
    document: doc,
    token: token || undefined,
    parameters,
    onStatus: ({ status }) => {
      onStatusChange?.(status);
    },
    onAuthenticated: () => {
      console.log(`[Hocuspocus] Successfully authenticated in room "${roomSlug}"`);
      onStatusChange?.("connected");
    },
    onAuthenticationFailed: ({ reason }) => {
      console.warn(`[Hocuspocus] Authentication rejected in room "${roomSlug}":`, reason);
      onStatusChange?.("disconnected");
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
