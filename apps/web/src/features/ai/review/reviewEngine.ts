/**
 * Generic Review Engine helpers.
 * Trading fields are rendered by TradingReviewForm; other parsers will
 * plug into the same shell using review_fields metadata from the API.
 */

export type ReviewFieldMeta = {
  key: string
  label: string
  field_type: string
  required?: boolean
  group?: string
  description?: string | null
  options?: string[]
}

export function fieldsByGroup(fields: ReviewFieldMeta[]): Record<string, ReviewFieldMeta[]> {
  const out: Record<string, ReviewFieldMeta[]> = {}
  for (const f of fields) {
    const g = f.group || "main"
    ;(out[g] ??= []).push(f)
  }
  return out
}

/** Trading parser still owns the concrete form; schema confirms expected keys. */
export function isTradingReviewSchema(fields: ReviewFieldMeta[]): boolean {
  const keys = new Set(fields.map((f) => f.key))
  return keys.has("trades") && keys.has("sections") && keys.has("journal_date")
}
