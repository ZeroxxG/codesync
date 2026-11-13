import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Realtime Crash & Persistence Recovery", () => {
  it("recovers 100% of document content and metadata after server restart", () => {
    // 1. Initial live session before crash
    const preCrashDoc = new Y.Doc();
    preCrashDoc.getText("monaco").insert(0, "# CodeSync Production Recovery Test\n\nimport os\nprint(os.getpid())\n");
    preCrashDoc.getMap("room-meta").set("language", "python");

    // 2. Persist binary snapshot (as done by onLoadDocument / onStoreDocument)
    const persistedSnapshot = Y.encodeStateAsUpdate(preCrashDoc);
    expect(persistedSnapshot.byteLength).toBeGreaterThan(0);

    // 3. Simulate killing the realtime server (destroying memory state)
    preCrashDoc.destroy();

    // 4. Spin up fresh document in new server process
    const recoveredDoc = new Y.Doc();
    expect(recoveredDoc.getText("monaco").toString()).toBe(""); // Clean state before load

    // 5. Apply persisted snapshot on load
    Y.applyUpdate(recoveredDoc, persistedSnapshot);

    // 6. Verify full recovery
    const recoveredText = recoveredDoc.getText("monaco").toString();
    const recoveredLanguage = recoveredDoc.getMap("room-meta").get("language");

    expect(recoveredText).toBe("# CodeSync Production Recovery Test\n\nimport os\nprint(os.getpid())\n");
    expect(recoveredLanguage).toBe("python");

    // 7. Verify subsequent edits apply seamlessly to recovered doc
    recoveredDoc.getText("monaco").insert(recoveredText.length, "# appended post-recovery\n");
    expect(recoveredDoc.getText("monaco").toString()).toContain("# appended post-recovery");
  });
});
