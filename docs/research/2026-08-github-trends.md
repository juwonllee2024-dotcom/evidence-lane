# Research record — 2026-08-17

## Account baseline

The public account review found seven repositories. Current stars were:

| Repository | Stars | Direction |
| --- | ---: | --- |
| `finish` | 0 | everyday input → completion path |
| `tomorrow-tax` | 0 | cost of making code harder to change |
| `openapps` | 0 | local-first open-source app discovery |
| `proofrail` | 1 | local evidence for AI-assisted code changes |
| `rulesync` | 2 | rules across AI coding tools |
| profile README | 1 | profile repository |
| `agentguard` | 1 | local firewall/DLP for coding agents |

GitHub’s public repository list exposed stars and forks. Clone/view traffic was not available in that list response, so no view number is invented here.

## What the trend scan suggested

The current GitHub conversation clusters around agent harnesses, local inference, document/PDF workflows, and trust tooling. The official [GitHub Trending page](https://github.com/trending) and a recent [GitHub trends review](https://www.techtarget.com/it-infrastructure/tip/What-repos-are-trending-on-GitHub) were used as discovery inputs. A current [trend snapshot](https://gitstar.space/) also showed strong momentum around agent and document tooling.

The signal is not simply “build another AI agent.” A discussion about [GitHub Trending becoming noisy](https://www.reddit.com/r/github/comments/1vq5hnf/github_trending_page_is_a_slop_fest_now/) reinforced a product constraint: the repository must demonstrate a concrete painkiller in one command, not rely on trend positioning alone.

## Four innovation passes

| Pass | Question | Candidate | Pain | Novelty | Build | Share | OSS fit | Total |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | What happens after someone collects proof? | **Evidence Lane** — local evidence compiler | 5 | 4 | 5 | 5 | 5 | **24/25** |
| 2 | Can a notice become a trustworthy deadline plan? | NoticeLens — obligations and deadlines | 4 | 3 | 4 | 4 | 4 | 19/25 |
| 3 | Can a screenshot be safe before it is shared? | ShareSafe — local redaction gate | 5 | 2 | 4 | 4 | 4 | 19/25 |
| 4 | Why must a person retell a problem at every handoff? | Handoff — chronological case capsule | 5 | 4 | 4 | 4 | 5 | 22/25 |

## Competitive gap

The scan found strong point solutions: [CloakFrame](https://github.com/nyattic/CloakFrame) for local image redaction, [ferret-scan](https://github.com/awslabs/ferret-scan) for file scanning, [Recipta](https://openreceiptformat.github.io/recipta/) for receipt storage, and [Skreen](https://github.com/levskiy0/skreenme) for screenshot workflows. ShareSafe would be too close to existing tools.

Evidence Lane combines the missing handoff layer: source-preserving inventory, redacted previews, provenance hashes, a human review gate, and a shareable packet. It is useful without AI and can later accept optional local adapters without changing the safety boundary.

## Decision

Build Evidence Lane first. Its demo is legible in seconds:

```text
folder of receipts + notes + screenshots
                    ↓
evidence-lane pack ./case --output packet.html
                    ↓
one local packet you can inspect before sending
```

The first release intentionally omits OCR and cloud integrations. Trust is the product; feature expansion comes after the evidence boundary is proven.
