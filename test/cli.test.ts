import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCli } from "../src/cli.js";

test("CLI creates a standalone HTML packet and can be run twice", () => {
  const root = mkdtempSync(join(tmpdir(), "evidence-lane-cli-"));
  const input = join(root, "case");
  const output = join(input, "packet.html");
  mkdirSync(input);
  writeFileSync(join(input, "note.txt"), "A clean note for support.");

  assert.equal(runCli(["pack", input, "--output", output], root), 0);
  assert.equal(existsSync(output), true);
  const first = readFileSync(output, "utf8");
  assert.match(first, /Evidence Lane/);
  assert.equal(runCli(["pack", input, "--output", output], root), 0);
  const second = readFileSync(output, "utf8");
  assert.equal(second.replace(/<strong>Generated:<\/strong>[^<]+/, "<strong>Generated:</strong>"), first.replace(/<strong>Generated:<\/strong>[^<]+/, "<strong>Generated:</strong>"));
});
