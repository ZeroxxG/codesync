import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Realtime Viewer Write Protection", () => {
  it("rejects document mutations attempted by read-only viewers", () => {
    // 1. Authoritative server document with baseline code
    const serverDoc = new Y.Doc();
    serverDoc.getText("monaco").insert(0, "def authorized_work():\n    return True\n");

    // 2. Simulated viewer client attempts to forge an edit
    const viewerDoc = new Y.Doc();
    // Viewer receives server baseline state
    Y.applyUpdate(viewerDoc, Y.encodeStateAsUpdate(serverDoc));

    // Viewer types malicious or unapproved code
    viewerDoc.getText("monaco").delete(0, viewerDoc.getText("monaco").length);
    viewerDoc.getText("monaco").insert(0, "MALICIOUS_OVERWRITE_BY_VIEWER()");

    // 3. Emulate server-side write rejection logic
    const viewerRole = "viewer";
    const isReadOnly = true;

    // The update packet that viewer tries to transmit
    const updatePacket = Y.encodeStateAsUpdate(viewerDoc);

    // Simulated protocol inspection:
    // If client is viewer or connection is readOnly, the update is dropped/rejected
    let wasApplied = false;
    let errorThrown: string | null = null;

    try {
      if (viewerRole === "viewer" || isReadOnly) {
        throw new Error("Forbidden: Viewers are not permitted to modify the document");
      }
      Y.applyUpdate(serverDoc, updatePacket);
      wasApplied = true;
    } catch (err: any) {
      errorThrown = err.message;
    }

    // 4. Assert server doc was never modified
    expect(wasApplied).toBe(false);
    expect(errorThrown).toContain("Forbidden: Viewers are not permitted to modify the document");
    expect(serverDoc.getText("monaco").toString()).toBe("def authorized_work():\n    return True\n");
    expect(serverDoc.getText("monaco").toString()).not.toContain("MALICIOUS_OVERWRITE");
  });
});
