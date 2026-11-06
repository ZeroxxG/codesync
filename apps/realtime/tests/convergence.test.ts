import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { awarenessProtocol } from "y-protocols";

describe("Yjs CRDT Concurrent Editing Convergence", () => {
  it("converges 3 clients making concurrent insertions at different locations", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const docC = new Y.Doc();

    // Initial synchronized baseline state
    docA.getText("monaco").insert(0, "def calculate():\n    return 42\n");
    const initUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, initUpdate);
    Y.applyUpdate(docC, initUpdate);

    // Simulate concurrent, isolated edits while disconnected / in-flight
    // Client A adds docstring at index 17
    docA.getText("monaco").insert(17, '    """Calculate magic constant."""\n');

    // Client B appends a print call at the end
    const lenB = docB.getText("monaco").length;
    docB.getText("monaco").insert(lenB, "\nprint(calculate())\n");

    // Client C adds a type hint to function definition
    docC.getText("monaco").delete(13, 0); // No delete
    docC.getText("monaco").insert(13, " -> int");

    // Capture pending updates
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);
    const updateC = Y.encodeStateAsUpdate(docC);

    // Sync out of order to test CRDT determinism
    // Client A receives C then B
    Y.applyUpdate(docA, updateC);
    Y.applyUpdate(docA, updateB);

    // Client B receives A then C
    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docB, updateC);

    // Client C receives B then A
    Y.applyUpdate(docC, updateB);
    Y.applyUpdate(docC, updateA);

    const finalA = docA.getText("monaco").toString();
    const finalB = docB.getText("monaco").toString();
    const finalC = docC.getText("monaco").toString();

    // All documents must converge to the exact same text
    expect(finalA).toBe(finalB);
    expect(finalB).toBe(finalC);

    // Verify all 3 edits are present
    expect(finalA).toContain(" -> int");
    expect(finalA).toContain('"""Calculate magic constant."""');
    expect(finalA).toContain("print(calculate())");
  });

  it("converges 3 clients typing concurrently at the exact same index", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const doc3 = new Y.Doc();

    // All 3 insert concurrently at index 0 without seeing each other's edits
    doc1.getText("monaco").insert(0, "ALPHA_");
    doc2.getText("monaco").insert(0, "BETA_");
    doc3.getText("monaco").insert(0, "GAMMA_");

    // Cross-sync all updates
    const u1 = Y.encodeStateAsUpdate(doc1);
    const u2 = Y.encodeStateAsUpdate(doc2);
    const u3 = Y.encodeStateAsUpdate(doc3);

    Y.applyUpdate(doc1, u2);
    Y.applyUpdate(doc1, u3);

    Y.applyUpdate(doc2, u1);
    Y.applyUpdate(doc2, u3);

    Y.applyUpdate(doc3, u1);
    Y.applyUpdate(doc3, u2);

    const text1 = doc1.getText("monaco").toString();
    const text2 = doc2.getText("monaco").toString();
    const text3 = doc3.getText("monaco").toString();

    expect(text1).toBe(text2);
    expect(text2).toBe(text3);
    expect(text1).toContain("ALPHA_");
    expect(text1).toContain("BETA_");
    expect(text1).toContain("GAMMA_");
    expect(text1.length).toBe(6 + 5 + 6); // Exactly 17 characters, no lost edits
  });

  it("converges room-meta language selection across clients", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Initial state: python
    docA.getMap("room-meta").set("language", "python");
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    expect(docB.getMap("room-meta").get("language")).toBe("python");

    // Client B changes language to javascript
    docB.getMap("room-meta").set("language", "javascript");
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    expect(docA.getMap("room-meta").get("language")).toBe("javascript");
  });
});
