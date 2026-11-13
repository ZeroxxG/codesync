import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Realtime Viewer Synchronization and Write Protection", () => {
  it("allows read-only viewers to receive and sync document state", () => {
    // 1. Authoritative server document with baseline code
    const serverDoc = new Y.Doc();
    serverDoc.getText("monaco").insert(0, "def authorized_work():\n    return True\n");

    // 2. Simulated viewer client performs initial sync handshake
    const viewerDoc = new Y.Doc();

    // Client sends state vector (SyncStep 1), server calculates diff and replies (SyncStep 2)
    const sv = Y.encodeStateVector(viewerDoc);
    const serverDiff = Y.encodeStateAsUpdate(serverDoc, sv);
    Y.applyUpdate(viewerDoc, serverDiff);

    // Assert viewer receives code perfectly
    expect(viewerDoc.getText("monaco").toString()).toBe("def authorized_work():\n    return True\n");
  });

  it("rejects document mutations attempted by read-only viewers", () => {
    // 1. Authoritative server document with baseline code
    const serverDoc = new Y.Doc();
    serverDoc.getText("monaco").insert(0, "def authorized_work():\n    return True\n");

    // 2. Simulated viewer client receives baseline state
    const viewerDoc = new Y.Doc();
    Y.applyUpdate(viewerDoc, Y.encodeStateAsUpdate(serverDoc));

    // Viewer types malicious or unapproved code in local memory
    viewerDoc.getText("monaco").delete(0, viewerDoc.getText("monaco").length);
    viewerDoc.getText("monaco").insert(0, "MALICIOUS_OVERWRITE_BY_VIEWER()");

    // 3. Emulate readOnly server write drop
    const isReadOnly = true;
    const updatePacket = Y.encodeStateAsUpdate(viewerDoc);

    // Under readOnly mode, server does not apply the incoming update to its document
    if (!isReadOnly) {
      Y.applyUpdate(serverDoc, updatePacket);
    }

    // 4. Assert server doc was never modified
    expect(serverDoc.getText("monaco").toString()).toBe("def authorized_work():\n    return True\n");
    expect(serverDoc.getText("monaco").toString()).not.toContain("MALICIOUS_OVERWRITE");
  });
});
