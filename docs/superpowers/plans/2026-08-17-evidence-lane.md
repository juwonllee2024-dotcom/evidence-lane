# Evidence Lane implementation plan

## Goal

Create a local-first CLI that turns a folder of receipts, screenshots, emails, and notes into a reviewable case packet without uploading, editing, or silently executing anything.

## Product boundary

- Supported input: a local directory; text-like files are previewed, binary files are inventoried.
- Every item receives a stable evidence ID, relative path, byte size, and SHA-256 hash.
- Text previews are redacted for obvious email, phone, payment-card, secret, and labeled-address patterns.
- The tool reports risk; it does not claim that redaction is exhaustive and it never invents facts.
- Output formats: standalone HTML, Markdown, and JSON.
- No OCR, cloud calls, package-manager installs, or mutation of source files in v0.1.

## Architecture

1. `detect.ts`: deterministic, dependency-free risk detection and preview redaction.
2. `scan.ts`: safe recursive directory inventory, metadata loading, hashing, and packet assembly.
3. `render.ts`: escaped Markdown/JSON/HTML renderers; HTML has no network dependencies.
4. `cli.ts`: small argument parser and file writer for `pack`.

## Verification gates

- Unit tests for risk detection, Luhn card filtering, redaction, hashing, traversal, metadata defaults, and renderer escaping.
- CLI smoke test against a fixture case.
- `npm test`, `npm run lint`, demo HTML generation, and `git diff --check` must pass.
- A final audit must confirm no network request, destructive operation, secret, or generated raw PII is committed.

## Delivery

Publish a public MIT-licensed GitHub repository with README quick start, example case, security policy, contribution guide, CI, and a release-quality initial commit.
