export const TOOL_VERSION = "0.1.0";

export type EvidenceType = "text" | "json" | "binary";
export type RiskKind = "email" | "phone" | "payment-card" | "secret" | "address";
export type RiskLevel = "none" | "review" | "high";

export interface RiskMatch {
  kind: RiskKind;
  label: string;
  count: number;
  lineNumbers: number[];
}

export interface RiskReport {
  level: RiskLevel;
  matches: RiskMatch[];
}

export interface EvidenceItem {
  id: string;
  relativePath: string;
  byteLength: number;
  sha256: string;
  type: EvidenceType;
  risk: RiskReport;
  preview?: string;
  previewTruncated?: boolean;
}

export interface CaseMetadata {
  title: string;
  recipient?: string;
  goal?: string;
  deadline?: string;
  tags?: string[];
}

export interface PacketSummary {
  totalFiles: number;
  textFiles: number;
  binaryFiles: number;
  highRiskFiles: number;
  reviewFiles: number;
  riskMatches: number;
}

export interface EvidencePacket {
  schemaVersion: "1";
  toolVersion: string;
  generatedAt: string;
  sourceRoot: string;
  case: CaseMetadata;
  items: EvidenceItem[];
  summary: PacketSummary;
  checklist: string[];
}

export interface ScanOptions {
  generatedAt?: string;
  toolVersion?: string;
  excludePaths?: string[];
}
