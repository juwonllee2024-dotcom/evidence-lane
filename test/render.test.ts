import assert from "node:assert/strict";
import test from "node:test";
import { renderHtml, renderMarkdown } from "../src/render.js";
import type { EvidencePacket } from "../src/types.js";

const packet: EvidencePacket = {
  schemaVersion: "1",
  toolVersion: "0.1.0",
  generatedAt: "2026-08-17T12:00:00.000Z",
  sourceRoot: "return-case",
  case: { title: "Return <headphones>", recipient: "Support", goal: "Ask for help" },
  items: [{
    id: "E1",
    relativePath: "note.md",
    byteLength: 12,
    sha256: "a".repeat(64),
    type: "text",
    risk: { level: "review", matches: [{ kind: "email", label: "Email", count: 1, lineNumbers: [1] }] },
    preview: "Contact: [EMAIL REDACTED]"
  }],
  summary: { totalFiles: 1, textFiles: 1, binaryFiles: 0, highRiskFiles: 0, reviewFiles: 1, riskMatches: 1 },
  checklist: ["Review redactions before sharing"]
};

test("HTML escapes case content and stays self-contained", () => {
  const html = renderHtml(packet);
  assert.match(html, /Return &lt;headphones&gt;/);
  assert.equal(html.includes("https://"), false);
  assert.match(html, /EMAIL REDACTED/);
  assert.match(html, /data-risk="review"/);
});

test("Markdown contains provenance and the sharing checklist", () => {
  const markdown = renderMarkdown(packet);
  assert.match(markdown, /E1/);
  assert.match(markdown, /a{64}/);
  assert.match(markdown, /Review redactions before sharing/);
  assert.match(markdown, /Return &lt;headphones&gt;/);
});
