import { describe, expect, it } from "vitest"

import {
  cloneImportReviewDraft,
  mapApiToReviewDraft,
  mapReviewDraftToApi,
  pageFileUrl,
} from "@/features/ai/importMappers"
import type { ImportReviewDraft } from "@/features/ai/importReviewTypes"
import type { ImportPageOut, JournalDraft } from "@/features/ai/importTypes"

const pages: ImportPageOut[] = [
  {
    id: "page-b",
    job_id: "job-1",
    page_index: 1,
    original_file_name: "p2.png",
    mime_type: "image/png",
    byte_size: 10,
    checksum: "x",
    status: "uploaded",
    quality_score: null,
    ocr_confidence: null,
    has_ocr_transcript: false,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
  },
  {
    id: "page-a",
    job_id: "job-1",
    page_index: 0,
    original_file_name: "p1.png",
    mime_type: "image/png",
    byte_size: 10,
    checksum: "y",
    status: "uploaded",
    quality_score: null,
    ocr_confidence: 0.9,
    has_ocr_transcript: true,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
  },
]

const apiDraft: JournalDraft = {
  journal_date: "2026-07-15",
  title: "Notebook",
  market: "NSE",
  primary_instrument: "NIFTY",
  day_bias: "bullish",
  day_result: null,
  day_pnl: null,
  daily_rating: null,
  overall_grade: "A",
  tags: ["session"],
  uncategorized_markdown: null,
  sections: [
    {
      section_key: "market_context",
      heading_original: "Market Context",
      body_markdown: "Gap up",
      sort_order: 0,
      confidence: 0.7,
    },
  ],
  trades: [
    {
      trade_index: 1,
      title_suffix: null,
      instrument: "NIFTY 24500 CE",
      direction: "LONG",
      quantity: "65",
      entry_price: "120",
      exit_price: "145",
      stop_price: null,
      result: "win",
      pnl: "1625",
      setup: null,
      grade: "A",
      dqs_score: null,
      dqs_max: null,
      raw_markdown: "",
      sections: [
        {
          section_key: "trade_setup",
          heading_original: "Setup",
          body_markdown: "Breakout",
          sort_order: 0,
          confidence: 0.6,
        },
      ],
      attachment_page_ids: [],
      confidence: 0.65,
    },
  ],
  day_attachment_page_ids: ["page-a", "page-b"],
}

describe("pageFileUrl", () => {
  it("encodes access token in query", () => {
    expect(pageFileUrl("page-1", "tok+1")).toBe(
      "/api/v1/ai/imports/pages/page-1/file?access_token=tok%2B1",
    )
  })
})

describe("mapApiToReviewDraft", () => {
  it("sorts pages and normalizes direction", () => {
    const review = mapApiToReviewDraft({
      jobId: "job-1",
      draft: apiDraft,
      confidence: {
        overall: 0.8,
        journal_date: 0.9,
        fields: { ocr: 0.7 },
        notes: "ok",
      },
      pages,
      accessToken: "abc",
    })

    expect(review.images.map((i) => i.id)).toEqual(["page-a", "page-b"])
    expect(review.trades[0]?.direction).toBe("long")
    expect(review.images[0]?.src).toContain("access_token=abc")
    expect(review.confidence.overall).toBe(0.8)
  })
})

describe("mapReviewDraftToApi round-trip", () => {
  it("preserves core fields after edit cycle", () => {
    const review = mapApiToReviewDraft({
      jobId: "job-1",
      draft: apiDraft,
      confidence: { overall: 0.8, journal_date: 0.9, fields: {}, notes: "" },
      pages,
      accessToken: "abc",
    })

    review.title = "Edited"
    review.trades[0]!.instrument = "BANKNIFTY"
    review.trades[0]!.direction = "short"

    const back = mapReviewDraftToApi(review)
    expect(back.title).toBe("Edited")
    expect(back.trades[0]?.instrument).toBe("BANKNIFTY")
    expect(back.trades[0]?.direction).toBe("short")
    expect(back.day_attachment_page_ids).toEqual(["page-a", "page-b"])
    expect(back.journal_date).toBe("2026-07-15")
  })
})

describe("cloneImportReviewDraft", () => {
  it("deep clones so edits do not mutate baseline", () => {
    const review = mapApiToReviewDraft({
      jobId: "job-1",
      draft: apiDraft,
      confidence: { overall: 0.5, journal_date: 0.5, fields: {}, notes: "" },
      pages,
      accessToken: "t",
    })
    const clone = cloneImportReviewDraft(review)
    clone.title = "mutated"
    expect(review.title).toBe("Notebook")
    expect(clone.title).toBe("mutated")
  })
})

describe("empty trade direction", () => {
  it("maps invalid direction to empty string then null on save", () => {
    const review: ImportReviewDraft = mapApiToReviewDraft({
      jobId: "job-1",
      draft: {
        ...apiDraft,
        trades: [{ ...apiDraft.trades[0]!, direction: "sideways" }],
      },
      confidence: null,
      pages,
      accessToken: "t",
    })
    expect(review.trades[0]?.direction).toBe("")
    const back = mapReviewDraftToApi(review)
    expect(back.trades[0]?.direction).toBeNull()
  })
})
