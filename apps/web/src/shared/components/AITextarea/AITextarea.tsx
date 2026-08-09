import { useCallback, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Heading,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Quote,
  RefreshCw,
  Sparkles,
  Table,
  Underline,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/shared/lib/utils"
import {
  useLiveWritingPolish,
  type LivePolishMeta,
} from "@/shared/components/AITextarea/useLiveWritingPolish"
import "@/shared/components/AITextarea/aiTextarea.css"

export type AITextareaProps = {
  fieldId: string
  fieldName: string
  fieldDescription?: string
  placeholder?: string
  writingStyle?: string
  aiInstruction?: string
  enableAI?: boolean
  value: string
  onChange: (value: string) => void
  minHeight?: number
  mode?: "plain" | "markdown"
  className?: string
  showFieldTitle?: boolean
  debounceMs?: number
  id?: string
}

function wrapSelection(
  el: HTMLTextAreaElement,
  before: string,
  after = before,
  placeholder = "text",
) {
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = el.value.slice(start, end) || placeholder
  const next = el.value.slice(0, start) + before + selected + after + el.value.slice(end)
  const cursor = start + before.length + selected.length + after.length
  return { next, cursor }
}

export function AITextarea({
  fieldId,
  fieldName,
  fieldDescription,
  placeholder = "Write your raw thoughts…",
  writingStyle = "Professional trading journal — natural, human, fluent English",
  aiInstruction = "Transform raw / Hindi / Hinglish / fragmented notes into polished journal prose. Preserve all facts. Invent nothing.",
  enableAI = true,
  value,
  onChange,
  minHeight = 140,
  mode = "plain",
  className,
  showFieldTitle = true,
  debounceMs = 800,
  id,
}: AITextareaProps) {
  const autoId = useId()
  const textareaId = id ?? `ai-ta-${fieldId || autoId}`
  const ref = useRef<HTMLTextAreaElement>(null)
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const [acceptedFlash, setAcceptedFlash] = useState(false)

  const meta: LivePolishMeta = {
    fieldId,
    fieldName,
    fieldDescription,
    writingStyle,
    aiInstruction,
  }

  const { polished, status, error, regenerate } = useLiveWritingPolish({
    text: value,
    enabled: enableAI,
    debounceMs,
    meta,
  })

  const apply = useCallback(
    (before: string, after = before, placeholderText = "text") => {
      const el = ref.current
      if (!el) {
        onChange(`${before}${placeholderText}${after}`)
        return
      }
      const { next, cursor } = wrapSelection(el, before, after, placeholderText)
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(cursor, cursor)
      })
    },
    [onChange],
  )

  const tools = [
    { label: "Heading", icon: Heading, run: () => apply("\n## ", "", "Heading") },
    { label: "Bold", icon: Bold, run: () => apply("**", "**") },
    { label: "Italic", icon: Italic, run: () => apply("*", "*") },
    { label: "Underline", icon: Underline, run: () => apply("<u>", "</u>") },
    { label: "Bullet list", icon: List, run: () => apply("\n- ", "", "item") },
    { label: "Numbered list", icon: ListOrdered, run: () => apply("\n1. ", "", "item") },
    { label: "Checklist", icon: ListChecks, run: () => apply("\n- [ ] ", "", "task") },
    { label: "Quote", icon: Quote, run: () => apply("\n> ", "", "quote") },
    { label: "Code", icon: Code, run: () => apply("`", "`", "code") },
    {
      label: "Table",
      icon: Table,
      run: () => apply("\n| Col | Col |\n| --- | --- |\n|  |  |\n", "", ""),
    },
    { label: "Image", icon: ImageIcon, run: () => apply("![", "](url)", "alt") },
    { label: "Link", icon: LinkIcon, run: () => apply("[", "](url)", "label") },
  ] as const

  const copyPolished = async () => {
    if (!polished) return
    try {
      await navigator.clipboard.writeText(polished)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  const acceptPolished = () => {
    if (!polished) return
    onChange(polished)
    setAcceptedFlash(true)
    window.setTimeout(() => setAcceptedFlash(false), 1200)
  }

  const showPreview = enableAI && (status !== "idle" || Boolean(polished) || Boolean(error))
  const statusLabel =
    status === "loading" || status === "debouncing"
      ? "Writing…"
      : status === "ready"
        ? "Journal preview"
        : status === "unavailable"
          ? "AI unavailable"
          : status === "error"
            ? "Rewrite failed"
            : null

  return (
    <div className={cn("ai-textarea", className)} data-field-id={fieldId}>
      {showFieldTitle ? (
        <div className="ai-textarea__header">
          <div className="ai-textarea__title-row">
            <h3 className="ai-textarea__title">{fieldName}</h3>
            {enableAI ? (
              <span className="ai-textarea__badge">
                <Sparkles size={12} strokeWidth={1.75} />
                Live Copilot
              </span>
            ) : null}
          </div>
          {fieldDescription ? (
            <p className="ai-textarea__desc">{fieldDescription}</p>
          ) : null}
        </div>
      ) : null}

      <div className={cn("ai-textarea__editor", mode === "markdown" && "ai-textarea__editor--md")}>
        {mode === "markdown" ? (
          <div className="ai-textarea__toolbar" role="toolbar" aria-label="Markdown formatting">
            {tools.map((t) => (
              <button
                key={t.label}
                type="button"
                className="ai-textarea__tool"
                aria-label={t.label}
                title={t.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
              >
                <t.icon size={14} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          id={textareaId}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          spellCheck
          aria-label={fieldName}
        />
      </div>

      <AnimatePresence initial={false}>
        {showPreview ? (
          <motion.div
            className="ai-textarea__preview-wrap"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ai-textarea__arrow" aria-hidden>
              ↓
            </div>

            <div
              className={cn(
                "ai-textarea__preview",
                acceptedFlash && "ai-textarea__preview--accepted",
              )}
              data-expanded={expanded}
            >
              <div className="ai-textarea__preview-head">
                <span className="ai-textarea__preview-label">
                  {(status === "loading" || status === "debouncing") && (
                    <Loader2 size={13} className="ai-textarea__spin" />
                  )}
                  {statusLabel ?? "Writing Copilot preview"}
                </span>
                <button
                  type="button"
                  className="ai-textarea__icon-btn"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? "Collapse" : "Expand"}
                  title={expanded ? "Collapse" : "Expand"}
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ai-textarea__preview-body"
                  >
                    {error ? (
                      <p className="ai-textarea__error">{error}</p>
                    ) : polished ? (
                      <div className="ai-textarea__markdown">
                        <ReactMarkdown>{polished}</ReactMarkdown>
                      </div>
                    ) : status === "loading" || status === "debouncing" ? (
                      <p className="ai-textarea__muted">Turning your thoughts into journal prose…</p>
                    ) : (
                      <p className="ai-textarea__muted">
                        Keep typing — Writing Copilot rewrites after you pause (~800ms).
                      </p>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="ai-textarea__actions">
              <button
                type="button"
                className="ai-textarea__btn"
                disabled={!polished}
                onClick={() => void copyPolished()}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ai-textarea__btn ai-textarea__btn--primary"
                disabled={!polished}
                onClick={acceptPolished}
              >
                <Check size={14} />
                Accept Journal Version
              </button>
              <button
                type="button"
                className="ai-textarea__btn ai-textarea__btn--ghost"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? "Collapse" : "Expand"}
              </button>
              <button
                type="button"
                className="ai-textarea__btn ai-textarea__btn--ghost"
                disabled={status === "loading" || !value.trim()}
                onClick={regenerate}
              >
                <RefreshCw size={14} className={status === "loading" ? "ai-textarea__spin" : undefined} />
                Regenerate
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
