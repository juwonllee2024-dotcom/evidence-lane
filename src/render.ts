import type { EvidenceItem, EvidencePacket, RiskLevel } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "\\|");
}

function riskLabel(level: RiskLevel): string {
  return level === "high" ? "HIGH" : level === "review" ? "REVIEW" : "CLEAR";
}

function matchSummary(item: EvidenceItem): string {
  if (item.risk.matches.length === 0) return "No obvious matches";
  return item.risk.matches.map((match) => `${match.label} (${match.count}; lines ${match.lineNumbers.join(", ")})`).join("; ");
}

function safePreview(preview: string): string {
  return preview.replaceAll("```", "``\\u200b`");
}

export function renderJson(packet: EvidencePacket): string {
  return `${JSON.stringify(packet, null, 2)}\n`;
}

export function renderMarkdown(packet: EvidencePacket): string {
  const lines = [
    `# Evidence Lane — ${escapeMarkdown(packet.case.title)}`,
    "",
    "> A local, reviewable case packet. Evidence Lane never uploads or edits your source files.",
    "",
    `- **Recipient:** ${escapeMarkdown(packet.case.recipient ?? "Not specified")}`,
    `- **Goal:** ${escapeMarkdown(packet.case.goal ?? "Not specified")}`,
    `- **Deadline:** ${escapeMarkdown(packet.case.deadline ?? "Not specified")}`,
    `- **Generated:** ${escapeMarkdown(packet.generatedAt)}`,
    "",
    "## At a glance",
    "",
    `- ${packet.summary.totalFiles} files · ${packet.summary.textFiles} text · ${packet.summary.binaryFiles} binary`,
    `- ${packet.summary.highRiskFiles} HIGH · ${packet.summary.reviewFiles} REVIEW · ${packet.summary.riskMatches} risk matches`,
    "",
    "## Sharing checklist",
    "",
    ...packet.checklist.map((item) => `- [ ] ${escapeMarkdown(item)}`),
    "",
    "## Evidence ledger",
    "",
    "| ID | Source | Type | Risk | SHA-256 |",
    "| --- | --- | --- | --- | --- |",
    ...packet.items.map((item) => `| ${item.id} | ${escapeMarkdown(item.relativePath)} | ${item.type} | ${riskLabel(item.risk.level)} | \`${item.sha256}\` |`),
    ""
  ];

  for (const item of packet.items) {
    lines.push(
      `### ${item.id} — ${escapeMarkdown(item.relativePath)}`,
      "",
      `**Risk:** ${riskLabel(item.risk.level)} — ${escapeMarkdown(matchSummary(item))}`,
      "",
      "```text",
      safePreview(item.preview ?? "Binary file — attach or review the original separately."),
      "```",
      ""
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderItem(item: EvidenceItem): string {
  const preview = escapeHtml(item.preview ?? "Binary file — attach or review the original separately.");
  const matches = escapeHtml(matchSummary(item));
  return `
    <article class="evidence" data-risk="${item.risk.level}" data-search="${escapeHtml(`${item.id} ${item.relativePath} ${matches}`)}">
      <div class="evidence-head">
        <div><span class="eyebrow">${item.id}</span><h3>${escapeHtml(item.relativePath)}</h3></div>
        <span class="risk risk-${item.risk.level}">${riskLabel(item.risk.level)}</span>
      </div>
      <p class="risk-detail">${matches}</p>
      <div class="hash"><span>SHA-256</span><code>${item.sha256}</code></div>
      <details><summary>Show redacted preview</summary><pre>${preview}</pre></details>
    </article>`;
}

export function renderHtml(packet: EvidencePacket): string {
  const riskNotice = packet.summary.highRiskFiles + packet.summary.reviewFiles > 0
    ? "Review flagged items before sharing."
    : "No obvious sharing risks were detected.";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Evidence Lane — ${escapeHtml(packet.case.title)}</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#647089; --line:#e4e8f0; --paper:#fff; --wash:#f5f7fb; --accent:#7357ff; --high:#c43d5b; --review:#bb7414; --clear:#16734a; }
    * { box-sizing:border-box; } body { margin:0; color:var(--ink); background:var(--wash); font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif; }
    main { max-width:1040px; margin:0 auto; padding:48px 20px 80px; } .hero { background:linear-gradient(135deg,#171d38,#40307d); color:#fff; border-radius:24px; padding:32px; box-shadow:0 20px 50px #25306120; }
    .eyebrow { color:#8d79ff; font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; } .hero .eyebrow { color:#bdb2ff; }
    h1 { margin:6px 0 10px; font-size:clamp(30px,5vw,52px); letter-spacing:-.04em; line-height:1.05; } h2 { margin:34px 0 14px; } h3 { margin:3px 0 0; overflow-wrap:anywhere; }
    .subtitle { color:#d9d7ec; margin:0; max-width:700px; } .facts { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; } .fact { background:#ffffff18; border:1px solid #ffffff2d; border-radius:12px; padding:9px 12px; }
    .panel { background:var(--paper); border:1px solid var(--line); border-radius:18px; padding:22px; margin-top:18px; } .notice { border-left:4px solid var(--review); } .notice strong { color:var(--review); }
    .checklist { display:grid; gap:10px; padding:0; list-style:none; } .checklist li { padding-left:26px; position:relative; } .checklist li::before { content:'□'; position:absolute; left:0; color:var(--accent); font-size:20px; line-height:1; }
    .toolbar { display:flex; gap:12px; align-items:center; margin:28px 0 14px; } input { flex:1; border:1px solid var(--line); border-radius:12px; padding:12px 14px; font:inherit; background:#fff; } .count { color:var(--muted); white-space:nowrap; }
    .evidence-list { display:grid; gap:14px; } .evidence { background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:20px; } .evidence[data-risk='high'] { border-color:#e9b7c2; } .evidence-head { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; } .risk { border-radius:99px; font-size:11px; font-weight:800; padding:4px 9px; letter-spacing:.05em; } .risk-high { color:var(--high); background:#fdebf0; } .risk-review { color:var(--review); background:#fff3dd; } .risk-none { color:var(--clear); background:#e6f6ee; }
    .risk-detail { color:var(--muted); margin:12px 0; } .hash { display:grid; gap:4px; color:var(--muted); font-size:12px; } code { overflow-wrap:anywhere; color:var(--ink); } details { margin-top:16px; } summary { cursor:pointer; color:var(--accent); font-weight:700; } pre { white-space:pre-wrap; overflow-wrap:anywhere; background:#f7f8fc; border-radius:12px; padding:14px; max-height:360px; overflow:auto; }
    footer { color:var(--muted); margin-top:28px; font-size:13px; } .empty { color:var(--muted); text-align:center; padding:32px; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Evidence Lane · local packet</div>
      <h1>${escapeHtml(packet.case.title)}</h1>
      <p class="subtitle">A reviewable path from scattered proof to a ready-to-send case file. No upload. No invented facts.</p>
      <div class="facts"><span class="fact">${packet.summary.totalFiles} files</span><span class="fact">${packet.summary.riskMatches} flagged matches</span><span class="fact">${escapeHtml(packet.case.recipient ?? "Recipient not set")}</span></div>
    </section>
    <section class="panel notice"><strong>${escapeHtml(riskNotice)}</strong><div>Evidence Lane reports obvious patterns; it is not a guarantee that every private detail has been found.</div></section>
    <section class="panel"><h2>Case brief</h2><p><strong>Goal:</strong> ${escapeHtml(packet.case.goal ?? "Not specified")}</p><p><strong>Deadline:</strong> ${escapeHtml(packet.case.deadline ?? "Not specified")}</p><p><strong>Generated:</strong> ${escapeHtml(packet.generatedAt)}</p></section>
    <section class="panel"><h2>Sharing checklist</h2><ul class="checklist">${packet.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    <div class="toolbar"><input id="filter" type="search" placeholder="Filter evidence by filename or risk…" aria-label="Filter evidence"><span class="count" id="count">${packet.items.length} items</span></div>
    <section class="evidence-list" id="evidence-list">${packet.items.map(renderItem).join("")}</section>
    <footer>Generated locally by Evidence Lane ${escapeHtml(packet.toolVersion)} · source files were not modified.</footer>
  </main>
  <script>
    const input = document.querySelector('#filter');
    const cards = [...document.querySelectorAll('.evidence')];
    const count = document.querySelector('#count');
    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      let visible = 0;
      cards.forEach((card) => { const show = !query || card.dataset.search.toLowerCase().includes(query); card.hidden = !show; if (show) visible += 1; });
      count.textContent = visible + ' items';
    });
  </script>
</body>
</html>
`;
}
