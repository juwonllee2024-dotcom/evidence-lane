import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { redactText, riskLevelFor } from "./detect.js";
import { TOOL_VERSION, type CaseMetadata, type EvidenceItem, type EvidencePacket, type ScanOptions } from "./types.js";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".json", ".csv", ".log", ".yaml", ".yml", ".toml"
]);
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".bmp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".7z", ".exe", ".dll", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".mp3", ".mp4", ".mov", ".wav"
]);
const MAX_PREVIEW_CHARS = 8_000;
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", ".venv", "venv"]);

function toPortablePath(value: string): string {
  return value.split("\\").join("/");
}

function humanizeFolderName(value: string): string {
  const humanized = value.replace(/[-_]+/g, " ").trim();
  return humanized.length > 0 ? humanized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Untitled case";
}

function safeMetadataValue(value: string): string {
  return redactText(value).text.trim();
}

function readCaseMetadata(root: string, files: string[]): CaseMetadata {
  const metadataPath = files.find((file) => toPortablePath(relative(root, file)) === "case.json");
  const fallback: CaseMetadata = { title: `Case from ${humanizeFolderName(basename(root))}` };
  if (!metadataPath) return fallback;

  try {
    const parsed: unknown = JSON.parse(readFileSync(metadataPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const record = parsed as Record<string, unknown>;
    const title = typeof record.title === "string" && record.title.trim().length > 0
      ? safeMetadataValue(record.title)
      : fallback.title;
    const metadata: CaseMetadata = { title };
    for (const key of ["recipient", "goal", "deadline"] as const) {
      if (typeof record[key] === "string" && record[key].trim().length > 0) metadata[key] = safeMetadataValue(record[key]);
    }
    if (Array.isArray(record.tags)) {
      const tags = record.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
      if (tags.length > 0) metadata.tags = tags.map((tag) => safeMetadataValue(tag));
    }
    return metadata;
  } catch {
    return fallback;
  }
}

function collectFiles(root: string, excluded: Set<string>): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const fullPath = resolve(join(directory, entry.name));
      if (excluded.has(fullPath)) continue;
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };
  visit(root);
  return files;
}

function isTextBuffer(buffer: Buffer, filePath: string): boolean {
  if (TEXT_EXTENSIONS.has(extname(filePath).toLowerCase())) return true;
  if (BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())) return false;
  return !buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0);
}

function hash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function makeItem(filePath: string, root: string, id: string): EvidenceItem {
  const buffer = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();
  const relativePath = toPortablePath(relative(root, filePath));
  const text = isTextBuffer(buffer, filePath) ? buffer.toString("utf8") : undefined;
  const type = text === undefined ? "binary" : extension === ".json" ? "json" : "text";
  const item: EvidenceItem = {
    id,
    relativePath,
    byteLength: buffer.byteLength,
    sha256: hash(buffer),
    type,
    risk: { level: "none", matches: [] }
  };
  if (text !== undefined) {
    const redacted = redactText(text);
    item.risk = { level: riskLevelFor(redacted.matches), matches: redacted.matches };
    item.previewTruncated = redacted.text.length > MAX_PREVIEW_CHARS;
    item.preview = redacted.text.slice(0, MAX_PREVIEW_CHARS);
    if (item.previewTruncated) item.preview += "\n… [preview truncated]";
  }
  return item;
}

export function scanDirectory(inputPath: string, options: ScanOptions = {}): EvidencePacket {
  const root = resolve(inputPath);
  if (!statSync(root).isDirectory()) throw new Error(`Input is not a directory: ${inputPath}`);
  const excluded = new Set((options.excludePaths ?? []).map((path) => resolve(path)));
  const files = collectFiles(root, excluded);
  const items = files.map((filePath, index) => makeItem(filePath, root, `E${index + 1}`));
  const summary = {
    totalFiles: items.length,
    textFiles: items.filter((item) => item.type !== "binary").length,
    binaryFiles: items.filter((item) => item.type === "binary").length,
    highRiskFiles: items.filter((item) => item.risk.level === "high").length,
    reviewFiles: items.filter((item) => item.risk.level === "review").length,
    riskMatches: items.reduce((total, item) => total + item.risk.matches.reduce((count, match) => count + match.count, 0), 0)
  };
  return {
    schemaVersion: "1",
    toolVersion: options.toolVersion ?? TOOL_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sourceRoot: basename(root),
    case: readCaseMetadata(root, files),
    items,
    summary,
    checklist: [
      "Review every HIGH or REVIEW item before sharing.",
      "Confirm the recipient and purpose; this packet does not make legal or factual claims.",
      "Original files are read-only to Evidence Lane and remain outside the packet.",
      "Use each SHA-256 value to verify the attachment you actually reviewed."
    ]
  };
}
