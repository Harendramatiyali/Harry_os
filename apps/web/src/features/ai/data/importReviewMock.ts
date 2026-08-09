import type { ImportReviewDraft } from "@/features/ai/importReviewTypes"

export { cloneImportReviewDraft } from "@/features/ai/importMappers"

/** Handwritten-notebook-style SVG placeholders (no network). */
function notebookSvg(opts: {
  title: string
  lines: string[]
  accent: string
  page: number
}): string {
  const lineEls = opts.lines
    .map(
      (t, i) =>
        `<text x="48" y="${140 + i * 28}" font-family="Georgia, serif" font-size="15" fill="#2a3340" opacity="0.85">${escapeXml(t)}</text>`,
    )
    .join("")
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f3ebe0"/>
      <stop offset="100%" stop-color="#e8dcc8"/>
    </linearGradient>
  </defs>
  <rect width="720" height="960" fill="url(#paper)"/>
  <rect x="36" y="0" width="8" height="960" fill="#c9b8a0" opacity="0.55"/>
  ${Array.from({ length: 28 }, (_, i) => `<line x1="56" y1="${90 + i * 28}" x2="680" y2="${90 + i * 28}" stroke="#cbbfaa" stroke-width="1"/>`).join("")}
  <text x="56" y="58" font-family="Georgia, serif" font-size="22" font-weight="700" fill="${opts.accent}">${escapeXml(opts.title)}</text>
  <text x="560" y="58" font-family="Georgia, serif" font-size="14" fill="#6b7280">Page ${opts.page}</text>
  ${lineEls}
  <circle cx="620" cy="860" r="36" fill="${opts.accent}" opacity="0.12"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Demo import review payload — replace with API later. */
export const importReviewMock: ImportReviewDraft = {
  job_id: "demo-import-job",
  title: "Notebook — 30 Jul 2026",
  journal_date: "2026-07-30",
  market: "Index Options",
  primary_instrument: "NIFTY 24400 PE",
  day_bias: "Bearish",
  day_result: "Green day",
  overall_grade: "A-",
  confidence: {
    overall: 0.62,
    journal_date: 0.88,
    fields: {
      ocr: 0.55,
      title: 0.7,
      sections: 0.58,
      trades: 0.48,
      instruments: 0.72,
      validation: 0.8,
    },
    notes: "Heuristic pipeline output — human review required before save.",
  },
  images: [
    {
      id: "img-1",
      page_index: 0,
      file_name: "notebook-p1.png",
      src: notebookSvg({
        title: "30 Jul — Pre-market",
        page: 1,
        accent: "#1f4b3a",
        lines: [
          "Bias: bearish into resistance",
          "Plan: wait for rejection at 24.5k",
          "Risk: 0.5R max · no FOMO",
          "Focus: process > PnL",
          "",
          "Market context",
          "Gap down open, sellers in control",
          "VIX calm — avoid chasing",
        ],
      }),
    },
    {
      id: "img-2",
      page_index: 1,
      file_name: "notebook-p2.png",
      src: notebookSvg({
        title: "Trade 1 — NIFTY PE",
        page: 2,
        accent: "#3b4f6b",
        lines: [
          "Instrument: NIFTY 24400 PE",
          "Entry 118 · Exit 146 · Qty 65",
          "Result: Win · Grade A",
          "",
          "Setup: rejection + follow-through",
          "Managed: trailed after 1R",
          "Mistake avoided: no early exit",
          "",
          "Learning: wait for confirmation",
        ],
      }),
    },
  ],
  sections: [
    {
      id: "sec-market",
      section_key: "market_context",
      heading: "Market Context",
      body:
        "Gap-down open with sellers in control. NIFTY struggled near 24,500 resistance. VIX stayed calm — no chase.",
      confidence: 0.58,
    },
    {
      id: "sec-plan",
      section_key: "trading_plan",
      heading: "Trading Plan",
      body:
        "Wait for rejection at resistance. Max risk 0.5R. Only take A-setups. Process over PnL.",
      confidence: 0.64,
    },
    {
      id: "sec-learn",
      section_key: "daily_learning",
      heading: "Daily Learning",
      body: "Confirmation before entry saved the day. Patience at the open mattered.",
      confidence: 0.51,
    },
  ],
  trades: [
    {
      id: "tr-1",
      trade_index: 1,
      instrument: "NIFTY 24400 PE",
      direction: "short",
      quantity: "65",
      entry_price: "118",
      exit_price: "146",
      result: "win",
      pnl: "18200",
      grade: "A",
      confidence: 0.48,
      sections: [
        {
          id: "tr-1-setup",
          section_key: "trade_setup",
          heading: "Trade Setup",
          body: "Rejection at resistance with follow-through. Entered after confirmation candle.",
          confidence: 0.52,
        },
        {
          id: "tr-1-mgmt",
          section_key: "trade_management",
          heading: "Trade Management",
          body: "Trailed after 1R. No early exit. Scaled at target zone.",
          confidence: 0.45,
        },
      ],
    },
  ],
}
