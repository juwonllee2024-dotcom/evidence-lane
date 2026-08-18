# Security policy

## Scope

Evidence Lane is designed to inspect local evidence without uploading it. The scanner is intentionally conservative about its claims: a `CLEAR` result means only that the built-in patterns found no match.

## Report a vulnerability

Please do not open a public issue containing real personal data, secrets, or private attachments. Use GitHub’s private vulnerability reporting for this repository when available. Otherwise, contact the maintainer privately through the account profile with:

- the affected version and operating system;
- a minimal reproduction with synthetic data;
- the expected and observed behavior;
- whether a source file was modified or data left the process.

## User safety notes

- Treat generated packets as sensitive until reviewed.
- Do not use real secrets or personal data in issue reports or fixtures.
- Review images and PDFs manually; v0.1 does not OCR their contents.
- Never assume a `CLEAR` badge proves that a packet is safe to send.
