# Contributing

Thanks for helping make everyday handoffs safer and less repetitive.

## Before opening a change

1. Keep the local-first, read-only source boundary intact.
2. Add or update a test before changing behavior.
3. Use synthetic fixtures only; never commit private evidence.
4. Keep output deterministic except for the explicit generation timestamp.

## Checks

```bash
npm install
npm test
npm run lint
git diff --check
```

For a new detector, include a positive case, a false-positive guard, and a redacted-preview assertion. Explain limitations in the README or SECURITY.md when a detector is intentionally incomplete.
