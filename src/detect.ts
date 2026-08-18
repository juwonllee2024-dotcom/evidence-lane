import type { RiskKind, RiskLevel, RiskMatch } from "./types.js";

interface RawMatch {
  kind: RiskKind;
  label: string;
  start: number;
  end: number;
  replacement: string;
}

const valuePatterns: Array<{
  kind: RiskKind;
  label: string;
  pattern: RegExp;
  replacement: string;
}> = [
  {
    kind: "email",
    label: "Email address",
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replacement: "[EMAIL REDACTED]"
  },
  {
    kind: "phone",
    label: "Phone number",
    pattern: /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}(?!\d)|(?<!\d)01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/g,
    replacement: "[PHONE REDACTED]"
  },
  {
    kind: "secret",
    label: "Token or secret",
    pattern: /(?:ghp_|github_pat_|sk-|xox[baprs]-|AKIA)[A-Za-z0-9_./~-]{10,}/g,
    replacement: "[SECRET REDACTED]"
  },
  {
    kind: "secret",
    label: "Bearer token",
    pattern: /Bearer\s+[A-Za-z0-9._~-]{12,}/gi,
    replacement: "[SECRET REDACTED]"
  }
];

const cardPattern = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;
const addressPattern = /(?:address|street address|배송지|주소)\s*[:：]/i;

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "\n") line += 1;
  }
  return line;
}

function passesLuhn(value: string): boolean {
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function collectRawMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];

  for (const definition of valuePatterns) {
    definition.pattern.lastIndex = 0;
    for (const match of text.matchAll(definition.pattern)) {
      const start = match.index ?? 0;
      matches.push({
        kind: definition.kind,
        label: definition.label,
        start,
        end: start + match[0].length,
        replacement: definition.replacement
      });
    }
  }

  cardPattern.lastIndex = 0;
  for (const match of text.matchAll(cardPattern)) {
    const value = match[0].replace(/[ -]/g, "");
    if (value.length < 13 || value.length > 19 || !passesLuhn(value)) continue;
    const start = match.index ?? 0;
    matches.push({
      kind: "payment-card",
      label: "Payment card number",
      start,
      end: start + match[0].length,
      replacement: "[PAYMENT CARD REDACTED]"
    });
  }

  let offset = 0;
  for (const line of text.split("\n")) {
    const labelMatch = line.match(addressPattern);
    if (labelMatch && labelMatch.index !== undefined) {
      const valueStart = labelMatch.index + labelMatch[0].length;
      if (valueStart < line.length) {
        matches.push({
          kind: "address",
          label: "Labeled address",
          start: offset + valueStart,
          end: offset + line.length,
          replacement: " [ADDRESS REDACTED]"
        });
      }
    }
    offset += line.length + 1;
  }

  return matches.sort((left, right) => left.start - right.start || right.end - right.start);
}

export function detectRisks(text: string): RiskMatch[] {
  const grouped = new Map<RiskKind, { label: string; count: number; lineNumbers: Set<number>; firstStart: number }>();
  for (const match of collectRawMatches(text)) {
    const current = grouped.get(match.kind);
    const lineNumber = lineNumberAt(text, match.start);
    if (current) {
      current.count += 1;
      current.lineNumbers.add(lineNumber);
      continue;
    }
    grouped.set(match.kind, {
      label: match.label,
      count: 1,
      lineNumbers: new Set([lineNumber]),
      firstStart: match.start
    });
  }

  return [...grouped.entries()]
    .sort((left, right) => left[1].firstStart - right[1].firstStart)
    .map(([kind, value]) => ({
      kind,
      label: value.label,
      count: value.count,
      lineNumbers: [...value.lineNumbers].sort((left, right) => left - right)
    }));
}

export function riskLevelFor(matches: RiskMatch[]): RiskLevel {
  if (matches.length === 0) return "none";
  if (matches.some((match) => match.kind === "payment-card" || match.kind === "secret")) return "high";
  return "review";
}

export function redactText(text: string): { text: string; matches: RiskMatch[] } {
  const rawMatches = collectRawMatches(text);
  const selected: RawMatch[] = [];
  let cursor = -1;
  for (const match of rawMatches) {
    if (match.start < cursor) continue;
    selected.push(match);
    cursor = match.end;
  }

  let redacted = text;
  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const match = selected[index];
    redacted = `${redacted.slice(0, match.start)}${match.replacement}${redacted.slice(match.end)}`;
  }
  return { text: redacted, matches: detectRisks(text) };
}
