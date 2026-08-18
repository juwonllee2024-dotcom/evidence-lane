import assert from "node:assert/strict";
import test from "node:test";
import { detectRisks, redactText, riskLevelFor } from "../src/detect.js";

test("detects common sharing risks and reports their line numbers", () => {
  const text = [
    "Order email: alex@example.com",
    "Call 010-1234-5678 if the return is delayed.",
    "Payment: 4111 1111 1111 1111",
    "Token: Bearer local-test-secret-value",
    "주소: 서울시 강남구 테헤란로 1"
  ].join("\n");

  const matches = detectRisks(text);
  assert.deepEqual(matches.map((match) => match.kind), [
    "email",
    "phone",
    "payment-card",
    "secret",
    "address"
  ]);
  assert.deepEqual(matches.map((match) => match.lineNumbers), [[1], [2], [3], [4], [5]]);
  assert.equal(riskLevelFor(matches), "high");
});

test("does not flag a non-Luhn long number as a payment card", () => {
  const matches = detectRisks("Reference: 1234 5678 9012 3456");
  assert.equal(matches.some((match) => match.kind === "payment-card"), false);
});

test("redaction removes sensitive values while keeping useful context", () => {
  const result = redactText("Send it to alex@example.com.\n주소: 1 Main Street");
  assert.equal(result.text.includes("alex@example.com"), false);
  assert.equal(result.text.includes("1 Main Street"), false);
  assert.match(result.text, /EMAIL REDACTED/);
  assert.match(result.text, /ADDRESS REDACTED/);
  assert.match(result.text, /Send it to/);
});
