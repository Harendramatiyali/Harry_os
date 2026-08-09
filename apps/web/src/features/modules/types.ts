/** Universal Module Design System — types */

export type ModuleId =
  | "neutral"
  | "trading"
  | "books"
  | "career"
  | "finance"
  | "health"
  | "knowledge"
  | "inbox"

export type ModuleMood =
  | "import"
  | "terminal"
  | "reading"
  | "workspace"
  | "ledger"
  | "wellness"
  | "notes"
  | "inbox"

export type ReviewLayoutId =
  | "split-terminal"
  | "book-folio"
  | "workspace-board"
  | "ledger-split"
  | "vitals-split"
  | "notes-clean"

export type ReviewHeroId = "notebook" | "cover" | "none"

export type MotionPreset = "fade-rise" | "paper-turn" | "tick-flash" | "soft-expand"

export type ModuleThemeTokens = {
  bg: string
  fg: string
  muted: string
  card: string
  border: string
  accent: string
  accentSoft: string
  positive: string
  negative: string
  warning: string
  paper: string
  glow: string
  progress: string
  radius: string
}

export type FieldGroupChrome = {
  id: string
  label: string
  icon?: string
  order: number
  description?: string
}

export type UploadChrome = {
  eyebrow: string
  title: string
  description: string
  dropTitle: string
  dropHint: string
  sessionLabel: string
  sessionPlaceholder: string
  addImagesLabel: string
  changeImagesLabel: string
  processLabel: string
  reprocessLabel: string
}

export type UnderstandChrome = {
  title: string
  description: string
}

export type ReviewChrome = {
  title: string
  description: string
  draftHeading: string
  imagesHeading: string
  saveLabel: string
  successTitle: string
  successCta: string
  successRoute: string
}

/** Left-rail section in the Dynamic Review Experience */
export type ReviewSectionDef = {
  id: string
  label: string
  icon: string
  /** Match draft.section_key (substring / exact) */
  matchKeys: string[]
  /** session | content | trades | images */
  kind: "session" | "content" | "trades" | "images"
  order: number
}

export type ModuleManifest = {
  id: ModuleId
  name: string
  shortName: string
  tagline: string
  parserType: string
  destinationModule: string
  ready: boolean
  route?: string
  identity: {
    icon: string
    mood: ModuleMood
  }
  theme: {
    mode: "dark" | "light" | "inherit"
    tokens: ModuleThemeTokens
    fontDisplay?: string
    fontBody?: string
    fontMono?: string
  }
  import: {
    upload: UploadChrome
    understand: UnderstandChrome
    review: ReviewChrome
    motion: MotionPreset[]
  }
  review: {
    layout: ReviewLayoutId
    hero: ReviewHeroId
    showConfidence: boolean
    fieldGroups: FieldGroupChrome[]
    sections: ReviewSectionDef[]
  }
  surfaces: {
    headerStyle: "terminal" | "folio" | "workspace" | "minimal" | "vital" | "notes"
    navStyle: "dense" | "airy" | "editorial"
    dashboardWidgets: string[]
  }
}
