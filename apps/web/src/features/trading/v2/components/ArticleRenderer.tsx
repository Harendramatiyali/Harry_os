import type { ReactNode } from "react"
import { Lightbulb } from "lucide-react"

import type { ArticleBlock } from "@/features/trading/v2/types"
import { ImageGallery } from "@/features/trading/v2/components/ImageGallery"
import { TradeDetailCard } from "@/features/trading/v2/tradeDetail/TradeDetailCard"
import { JournalPanelCard } from "@/features/trading/v2/journalWorkspace/JournalPanelCard"
import { cn } from "@/shared/lib/utils"

function CandlestickPlaceholder() {
  const candles = [
    { x: 24, o: 140, c: 110, h: 100, l: 150 },
    { x: 48, o: 115, c: 95, h: 88, l: 125 },
    { x: 72, o: 100, c: 130, h: 90, l: 138 },
    { x: 96, o: 125, c: 108, h: 100, l: 135 },
    { x: 120, o: 110, c: 85, h: 78, l: 118 },
    { x: 144, o: 90, c: 70, h: 62, l: 98 },
    { x: 168, o: 75, c: 105, h: 68, l: 112 },
    { x: 192, o: 100, c: 88, h: 80, l: 110 },
    { x: 216, o: 92, c: 118, h: 86, l: 124 },
    { x: 240, o: 115, c: 98, h: 90, l: 122 },
    { x: 264, o: 102, c: 75, h: 68, l: 110 },
    { x: 288, o: 80, c: 60, h: 52, l: 88 },
  ]
  return (
    <div className="tv2-chart">
      <svg viewBox="0 0 340 220" className="h-full w-full" aria-hidden>
        <line x1="16" y1="70" x2="324" y2="70" stroke="rgba(244,63,94,0.35)" strokeDasharray="4 4" />
        <line x1="16" y1="150" x2="324" y2="150" stroke="rgba(34,197,94,0.35)" strokeDasharray="4 4" />
        {candles.map((c) => {
          const up = c.c < c.o
          const color = up ? "#22c55e" : "#f43f5e"
          const top = Math.min(c.o, c.c)
          const height = Math.max(6, Math.abs(c.c - c.o))
          return (
            <g key={c.x}>
              <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={color} strokeWidth="1.5" />
              <rect x={c.x - 5} y={top} width="10" height={height} fill={color} rx="1" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Light structured renderer for journal markdown (headings, lists, paragraphs). */
export function FormattedJournalBody({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const nodes: ReactNode[] = []
  let listItems: string[] = []
  let listOrdered = false
  let key = 0

  const flushList = () => {
    if (!listItems.length) return
    const Tag = listOrdered ? "ol" : "ul"
    nodes.push(
      <Tag key={`list-${key++}`} className={listOrdered ? "tv2-md-ol" : "tv2-md-ul"}>
        {listItems.map((item, i) => (
          <li key={i}>
            <InlineMd text={item} />
          </li>
        ))}
      </Tag>,
    )
    listItems = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()

    const ul = trimmed.match(/^[-*•]\s+(.+)/)
    const ol = trimmed.match(/^\d+[.)]\s+(.+)/)
    if (ul || ol) {
      const nextOrdered = Boolean(ol)
      if (listItems.length && nextOrdered !== listOrdered) flushList()
      listOrdered = nextOrdered
      listItems.push((ul?.[1] ?? ol?.[1] ?? "").trim())
      continue
    }

    flushList()

    if (!trimmed) {
      nodes.push(<div key={`sp-${key++}`} className="h-2" />)
      continue
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length ?? 2
      const content = trimmed.replace(/^#{1,3}\s+/, "")
      const className = level <= 2 ? "tv2-md-h2" : "tv2-md-h3"
      nodes.push(
        <p key={`h-${key++}`} className={className}>
          <InlineMd text={content} />
        </p>,
      )
      continue
    }

    if (/^\*\*[^*]+\*\*:/.test(trimmed) || /^[A-Z][\w\s/]+:\s/.test(trimmed)) {
      nodes.push(
        <p key={`meta-${key++}`} className="tv2-md-meta">
          <InlineMd text={trimmed} />
        </p>,
      )
      continue
    }

    nodes.push(
      <p key={`p-${key++}`} className="tv2-md-p">
        <InlineMd text={trimmed} />
      </p>,
    )
  }

  flushList()
  return <div className="tv2-md">{nodes}</div>
}

function InlineMd({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith("**")) {
      parts.push(
        <strong key={i++} className="font-semibold text-[color:var(--tv2-fg)]">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={i++} className="tv2-md-code">
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      parts.push(
        <em key={i++} className="italic text-[color:var(--tv2-muted)]">
          {token.slice(1, -1)}
        </em>,
      )
    }
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

export function InsightCallout({ title, body }: { title: string; body: string }) {
  return (
    <div className="tv2-callout flex gap-3">
      <Lightbulb className="mt-0.5 size-4 shrink-0" style={{ color: "var(--tv2-amber)" }} />
      <div className="min-w-0">
        <p className="tv2-h3 mb-1" style={{ color: "var(--tv2-amber)" }}>
          {title}
        </p>
        <FormattedJournalBody text={body} />
      </div>
    </div>
  )
}

export function ArticleRenderer({ blocks }: { blocks: ArticleBlock[] }) {
  const wide = blocks.some((b) => b.type === "tradeDetail" || b.type === "journalPanel")
  return (
    <article className={cn("mx-auto space-y-6", wide ? "max-w-4xl" : "max-w-3xl")}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`
        if (block.type === "heading") {
          return (
            <h2 key={key} className="text-[clamp(1.35rem,1.2rem+0.6vw,1.75rem)] leading-tight font-bold tracking-[-0.03em]">
              {block.text}
            </h2>
          )
        }
        if (block.type === "section") {
          const Icon = block.icon
          return (
            <section key={key} className="space-y-2.5">
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="size-4 text-[color:var(--tv2-muted)]" /> : null}
                <h3 className="tv2-h3">{block.title}</h3>
              </div>
              <FormattedJournalBody text={block.body} />
            </section>
          )
        }
        if (block.type === "callout") {
          return <InsightCallout key={key} title={block.callout.title} body={block.callout.body} />
        }
        if (block.type === "chart") {
          return (
            <section key={key} className="space-y-3">
              <CandlestickPlaceholder />
            </section>
          )
        }
        if (block.type === "gallery") {
          return (
            <section key={key} className="tv2-gallery space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="tv2-h3">Screenshots</h3>
                <span className="tv2-caption">{block.images.length} images</span>
              </div>
              <ImageGallery images={block.images} showAdd={block.showAdd} />
            </section>
          )
        }
        if (block.type === "tradeDetail") {
          const tradeOrdinal = blocks
            .slice(0, index)
            .filter((b) => b.type === "tradeDetail").length
          return (
            <div key={key} className="td-stack">
              <TradeDetailCard trade={block.trade} defaultOpen={tradeOrdinal === 0} />
            </div>
          )
        }
        if (block.type === "journalPanel") {
          return <JournalPanelCard key={key} panel={block.panel} />
        }
        if (block.type === "custom") {
          return <div key={key}>{block.node}</div>
        }
        return null
      })}
    </article>
  )
}
