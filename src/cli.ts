#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { scanDirectory } from "./scan.js";
import { renderHtml, renderJson, renderMarkdown } from "./render.js";

type OutputFormat = "html" | "markdown" | "json";

function usage(): string {
  return `Evidence Lane — turn local proof into an honest, share-ready case packet.

Usage:
  evidence-lane pack <folder> [--output <file>] [--format html|markdown|json]

Examples:
  evidence-lane pack ./my-return --output ./my-return.html
  evidence-lane pack ./my-return --format markdown --output ./my-return.md
  evidence-lane pack ./my-return --format json --output ./my-return.json

The source folder is read-only. Text previews are redacted for obvious email,
phone, payment-card, secret, and labeled-address patterns.
`;
}

function formatFromPath(outputPath: string): OutputFormat {
  const extension = extname(outputPath).toLowerCase();
  if (extension === ".json") return "json";
  if (extension === ".md" || extension === ".markdown") return "markdown";
  return "html";
}

function takeOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

export function runCli(args: string[], cwd = process.cwd()): number {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(usage());
    return 0;
  }
  if (args[0] !== "pack") {
    console.error(`Unknown command: ${args[0]}\n\n${usage()}`);
    return 1;
  }
  try {
    const input = args[1];
    if (!input || input.startsWith("--")) throw new Error("pack requires an input folder");
    const outputOption = takeOption(args, "--output") ?? takeOption(args, "-o");
    const output = resolve(cwd, outputOption ?? "evidence-lane.html");
    const requestedFormat = takeOption(args, "--format") ?? takeOption(args, "-f");
    const format = (requestedFormat ?? formatFromPath(output)) as OutputFormat;
    if (!["html", "markdown", "json"].includes(format)) throw new Error(`Unsupported format: ${format}`);
    const inputPath = resolve(cwd, input);
    if (inputPath === output) throw new Error("Output must be a file, not the input folder");

    const packet = scanDirectory(inputPath, { excludePaths: [output] });
    const content = format === "html"
      ? renderHtml(packet)
      : format === "markdown"
        ? renderMarkdown(packet)
        : renderJson(packet);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content, "utf8");
    console.log(`Wrote ${format} packet: ${output}`);
    console.log(`${packet.summary.totalFiles} files · ${packet.summary.highRiskFiles} HIGH · ${packet.summary.reviewFiles} REVIEW`);
    return 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedFile && pathToFileURL(invokedFile).href === import.meta.url) {
  process.exitCode = runCli(process.argv.slice(2));
}
