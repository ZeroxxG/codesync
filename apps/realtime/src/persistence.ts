import * as Y from "yjs";

const internalApiUrl = process.env.INTERNAL_API_URL || "http://localhost:8000";
const getInternalToken = () => {
  const token = process.env.INTERNAL_API_TOKEN || "codesync-internal-token-change-in-prod";
  return token === "CHANGE_ME" ? "codesync-internal-token-change-in-prod" : token;
};
const debounceMs = Number(process.env.SNAPSHOT_DEBOUNCE_MS || 3000);
const maxBytes = Number(process.env.MAX_DOCUMENT_BYTES || 1048576);

const pendingTimers = new Map<string, NodeJS.Timeout>();

export async function loadRoomSnapshot(documentName: string, doc: Y.Doc): Promise<boolean> {
  const url = `${internalApiUrl}/internal/rooms/${encodeURIComponent(documentName)}/snapshot/`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Internal-Token": getInternalToken(),
      },
    });

    if (res.status === 204) {
      console.log(`[Realtime Persistence] No existing snapshot for room "${documentName}" (fresh room)`);
      return false;
    }

    if (!res.ok) {
      console.warn(`[Realtime Persistence] Failed to load snapshot for "${documentName}": HTTP ${res.status}`);
      return false;
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      Y.applyUpdate(doc, new Uint8Array(arrayBuffer));
      console.log(
        `[Realtime Persistence] Successfully loaded snapshot for "${documentName}" (${arrayBuffer.byteLength} bytes)`
      );
      return true;
    }
  } catch (err: any) {
    console.error(`[Realtime Persistence] Error loading snapshot for "${documentName}":`, err.message);
  }

  return false;
}

export async function saveRoomSnapshot(documentName: string, doc: Y.Doc): Promise<boolean> {
  const url = `${internalApiUrl}/internal/rooms/${encodeURIComponent(documentName)}/snapshot/`;

  try {
    const stateUpdate = Y.encodeStateAsUpdate(doc);

    if (stateUpdate.byteLength > maxBytes) {
      console.error(
        `[Realtime Persistence] Document "${documentName}" size (${stateUpdate.byteLength} bytes) exceeds limit (${maxBytes} bytes). Aborting save.`
      );
      return false;
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "X-Internal-Token": getInternalToken(),
        "Content-Type": "application/octet-stream",
      },
      body: stateUpdate,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Realtime Persistence] Failed to save snapshot for "${documentName}": HTTP ${res.status} - ${errorText}`);
      return false;
    }

    const result = await res.json();
    console.log(
      `[Realtime Persistence] Successfully saved snapshot for "${documentName}" (${result.size_bytes} bytes)`
    );
    return true;
  } catch (err: any) {
    console.error(`[Realtime Persistence] Error saving snapshot for "${documentName}":`, err.message);
    return false;
  }
}

export function debounceRoomSave(documentName: string, doc: Y.Doc): void {
  const existingTimer = pendingTimers.get(documentName);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    pendingTimers.delete(documentName);
    await saveRoomSnapshot(documentName, doc);
  }, debounceMs);

  pendingTimers.set(documentName, timer);
}

export async function flushRoomSave(documentName: string, doc: Y.Doc): Promise<void> {
  const existingTimer = pendingTimers.get(documentName);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingTimers.delete(documentName);
  }
  await saveRoomSnapshot(documentName, doc);
}
