/** Shared helpers for journal section textareas (avoid hydrate injecting headings). */

const AUTO_SECTION_HEADINGS = [
  "Market Overview",
  "Market Observation",
  "Intraday Observation",
  "Psychology",
  "IQ-200 Daily Evaluation",
  "Lessons Learned",
  "Daily Learning",
  "What Went Well",
  "Rules Reinforced",
  "Closing Note",
] as const

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Remove stacked `## Heading` prefixes so textareas stay clean for editing. */
export function stripAutoSectionHeadings(body: string, preferred?: string): string {
  let text = (body || "").trim()
  if (!text) return ""
  const headings = preferred
    ? [preferred, ...AUTO_SECTION_HEADINGS.filter((h) => h.toLowerCase() !== preferred.toLowerCase())]
    : [...AUTO_SECTION_HEADINGS]
  let guard = 0
  while (guard++ < 12) {
    let stripped = false
    for (const heading of headings) {
      const re = new RegExp(`^##\\s*${escapeRegExp(heading)}\\s*(?:\\n+|$)`, "i")
      if (re.test(text)) {
        text = text.replace(re, "").trim()
        stripped = true
        break
      }
    }
    if (!stripped) break
  }
  return text
}
