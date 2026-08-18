import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanDirectory } from "../src/scan.js";

test("scans a case without changing its source files", () => {
  const root = mkdtempSync(join(tmpdir(), "evidence-lane-"));
  const notePath = join(root, "timeline.md");
  const imagePath = join(root, "delivery.png");
  const note = "Bought on Monday.\nContact: alex@example.com";
  writeFileSync(join(root, "case.json"), JSON.stringify({
    title: "Return a damaged order",
    recipient: "alex@example.com",
    goal: "Request a return label",
    deadline: "2026-08-30"
  }));
  writeFileSync(notePath, note);
  writeFileSync(imagePath, Buffer.from([137, 80, 78, 71]));

  const packet = scanDirectory(root, { generatedAt: "2026-08-17T12:00:00.000Z" });
  const noteItem = packet.items.find((item) => item.relativePath === "timeline.md");
  const imageItem = packet.items.find((item) => item.relativePath === "delivery.png");

  assert.equal(packet.case.title, "Return a damaged order");
  assert.equal(packet.case.recipient?.includes("alex@example.com"), false);
  assert.equal(packet.case.goal, "Request a return label");
  assert.equal(packet.items.length, 3);
  assert.equal(noteItem?.risk.level, "review");
  assert.equal(noteItem?.preview?.includes("alex@example.com"), false);
  assert.equal(imageItem?.type, "binary");
  assert.equal(imageItem?.preview, undefined);
  assert.equal(readFileSync(notePath, "utf8"), note);
  assert.equal(packet.summary.totalFiles, 3);
  assert.equal(packet.summary.reviewFiles, 2);
});

test("excludes a requested output path so repeated packing stays stable", () => {
  const root = mkdtempSync(join(tmpdir(), "evidence-lane-"));
  const output = join(root, "packet.html");
  writeFileSync(join(root, "note.txt"), "A clean note");
  writeFileSync(output, "previous output");

  const packet = scanDirectory(root, { excludePaths: [output], generatedAt: "2026-08-17T12:00:00.000Z" });
  assert.deepEqual(packet.items.map((item) => item.relativePath), ["note.txt"]);
});
